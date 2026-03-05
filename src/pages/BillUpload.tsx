import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { simulateOcrExtraction, getConfidenceColor, getConfidenceLabel, type OcrResult } from "@/lib/ocr-simulator";
import { getApprovalChain, getApprovalThresholdLabel } from "@/lib/approval-engine";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileImage, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categories = Constants.public.Enums.bill_category;

export default function BillUpload() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [billDate, setBillDate] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [description, setDescription] = useState("");

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [justification, setJustification] = useState("");

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      toast({ title: "Invalid file", description: "Please upload JPG, PNG, or PDF files only.", variant: "destructive" });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB.", variant: "destructive" });
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }

    // Simulate OCR
    setExtracting(true);
    setTimeout(() => {
      const result = simulateOcrExtraction(selected.name);
      setOcrResult(result);
      setVendorName(result.vendorName);
      setAmount(result.amount.toString());
      setBillDate(result.billDate);
      setCategory(result.category);
      setExtracting(false);
    }, 1500);
  }, [toast]);

  const checkDuplicates = async () => {
    if (!vendorName || !amount || !billDate) return null;

    const sevenDaysAgo = new Date(new Date(billDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAfter = new Date(new Date(billDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data } = await supabase
      .from("bills")
      .select("id, vendor_name, amount, bill_date")
      .eq("vendor_name", vendorName)
      .eq("amount", parseFloat(amount))
      .gte("bill_date", sevenDaysAgo)
      .lte("bill_date", sevenDaysAfter);

    return data && data.length > 0 ? data[0] : null;
  };

  const handleSubmit = async (overrideDuplicate = false) => {
    if (!user || !file) return;

    // Check duplicates first
    if (!overrideDuplicate) {
      const dup = await checkDuplicates();
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Upload file
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("bill-images").upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const parsedAmount = parseFloat(amount);

      // Insert bill
      const { data: bill, error: billErr } = await supabase
        .from("bills")
        .insert({
          vendor_name: vendorName,
          amount: parsedAmount,
          bill_date: billDate,
          category: category as any,
          description,
          bill_image_path: filePath,
          status: "pending",
          ocr_confidence: ocrResult?.confidence ?? 0,
          ocr_extracted_data: ocrResult as any,
          created_by: user.id,
        })
        .select()
        .single();

      if (billErr) throw billErr;

      // Create approval chain
      const chain = getApprovalChain(parsedAmount);
      const approvals = chain.map((step) => ({
        bill_id: bill.id,
        approver_role: step.approver_role,
        sequence_order: step.sequence_order,
        is_active: step.is_active,
      }));

      await supabase.from("approvals").insert(approvals);

      // Log audit
      await supabase.from("audit_logs").insert({
        bill_id: bill.id,
        action: "uploaded",
        performed_by: user.id,
        user_role: role as any,
        details: { vendor: vendorName, amount: parsedAmount, ocr_confidence: ocrResult?.confidence },
      });

      // Handle duplicate override
      if (overrideDuplicate && duplicateWarning) {
        await supabase.from("bill_duplicates").insert({
          original_bill_id: duplicateWarning.id,
          duplicate_bill_id: bill.id,
          detection_method: "transaction_match",
          justification,
        });
      }

      // Console-log email notification
      console.log(`📧 EMAIL NOTIFICATION: New bill ₹${parsedAmount} from ${vendorName} needs approval. Route: ${getApprovalThresholdLabel(parsedAmount)}`);

      toast({ title: "Bill submitted!", description: `Routed for approval: ${getApprovalThresholdLabel(parsedAmount)}` });
      navigate("/bills");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Expense Bill</h1>
          <p className="text-muted-foreground">Upload a bill image and our system will extract details automatically.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="h-5 w-5" /> Bill Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-border">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF (max 10MB)</p>
                </div>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
              </label>

              {preview && (
                <div className="mt-4 rounded-lg overflow-hidden border">
                  <img src={preview} alt="Bill preview" className="w-full max-h-64 object-contain bg-muted/30" />
                </div>
              )}
              {file && !preview && (
                <div className="mt-4 p-3 rounded-lg bg-muted flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-primary" />
                  <span className="text-sm">{file.name}</span>
                </div>
              )}

              {extracting && (
                <div className="mt-4 flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Extracting bill details...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted / editable form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Bill Details
              </CardTitle>
              {ocrResult && (
                <CardDescription>
                  <Badge className={`text-xs ${getConfidenceColor(ocrResult.confidence)}`}>
                    Overall Confidence: {getConfidenceLabel(ocrResult.confidence)} ({Math.round(ocrResult.confidence * 100)}%)
                  </Badge>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vendor">Vendor Name</Label>
                  {ocrResult && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceColor(ocrResult.fieldConfidences.vendorName)}`}>
                      {Math.round(ocrResult.fieldConfidences.vendorName * 100)}%
                    </span>
                  )}
                </div>
                <Input id="vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Enter vendor name" required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  {ocrResult && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceColor(ocrResult.fieldConfidences.amount)}`}>
                      {Math.round(ocrResult.fieldConfidences.amount * 100)}%
                    </span>
                  )}
                </div>
                <Input id="amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                {amount && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    Approval route: <span className="font-medium">{getApprovalThresholdLabel(parseFloat(amount) || 0)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="date">Bill Date</Label>
                  {ocrResult && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceColor(ocrResult.fieldConfidences.billDate)}`}>
                      {Math.round(ocrResult.fieldConfidences.billDate * 100)}%
                    </span>
                  )}
                </div>
                <Input id="date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description (optional)</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional notes..." rows={2} />
              </div>

              <Button className="w-full" onClick={() => handleSubmit()} disabled={!file || !vendorName || !amount || !billDate || submitting}>
                {submitting ? "Submitting..." : "Submit Bill"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Duplicate warning dialog */}
      <AlertDialog open={!!duplicateWarning} onOpenChange={() => setDuplicateWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Potential Duplicate Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              A similar bill was found: <strong>{duplicateWarning?.vendor_name}</strong> for <strong>₹{duplicateWarning?.amount}</strong> on{" "}
              <strong>{duplicateWarning?.bill_date}</strong>. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label htmlFor="justification">Justification for override</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this is not a duplicate..."
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)} disabled={!justification.trim()}>
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
