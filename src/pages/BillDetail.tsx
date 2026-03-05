import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle, XCircle, Clock, User, ZoomIn, ZoomOut } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const roleLabels: Record<string, string> = {
  employee: "Employee",
  accounts: "Accounts",
  manager: "Manager",
  md: "MD",
};

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bill, setBill] = useState<Tables<"bills"> | null>(null);
  const [approvals, setApprovals] = useState<Tables<"approvals">[]>([]);
  const [auditLogs, setAuditLogs] = useState<Tables<"audit_logs">[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [billRes, appRes, auditRes] = await Promise.all([
        supabase.from("bills").select("*").eq("id", id).single(),
        supabase.from("approvals").select("*").eq("bill_id", id).order("sequence_order"),
        supabase.from("audit_logs").select("*").eq("bill_id", id).order("created_at"),
      ]);
      setBill(billRes.data);
      setApprovals(appRes.data || []);
      setAuditLogs(auditRes.data || []);

      // Fetch profile names for audit logs
      const userIds = new Set([
        ...(auditRes.data || []).map((l) => l.performed_by),
        ...(appRes.data || []).filter((a) => a.approver_user_id).map((a) => a.approver_user_id!),
      ]);
      if (userIds.size > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", Array.from(userIds));
        const map: Record<string, string> = {};
        profs?.forEach((p) => { map[p.user_id] = p.full_name || p.email; });
        setProfiles(map);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const getImageUrl = () => {
    if (!bill?.bill_image_path) return null;
    const { data } = supabase.storage.from("bill-images").getPublicUrl(bill.bill_image_path);
    return data.publicUrl;
  };

  const handleApproval = async (action: "approved" | "rejected") => {
    if (!bill || !user || !role) return;
    setProcessing(true);

    try {
      const activeApproval = approvals.find((a) => a.is_active && a.status === "pending" && a.approver_role === role);
      if (!activeApproval) {
        toast({ title: "Cannot approve", description: "This bill is not awaiting your approval.", variant: "destructive" });
        return;
      }

      // Update approval
      await supabase.from("approvals").update({
        status: action,
        approver_user_id: user.id,
        comments: comment || null,
        action_timestamp: new Date().toISOString(),
      }).eq("id", activeApproval.id);

      // Log audit
      await supabase.from("audit_logs").insert({
        bill_id: bill.id,
        action,
        performed_by: user.id,
        user_role: role as any,
        details: { comments: comment },
      });

      if (action === "rejected") {
        await supabase.from("bills").update({ status: "rejected" }).eq("id", bill.id);
      } else {
        // Activate next approval or mark approved
        const nextApproval = approvals.find((a) => a.sequence_order === activeApproval.sequence_order + 1);
        if (nextApproval) {
          await supabase.from("approvals").update({ is_active: true }).eq("id", nextApproval.id);
          await supabase.from("bills").update({ status: "under_review" }).eq("id", bill.id);
          console.log(`📧 EMAIL NOTIFICATION: Bill ₹${bill.amount} now needs ${nextApproval.approver_role} approval.`);
        } else {
          await supabase.from("bills").update({ status: "approved" }).eq("id", bill.id);
        }
      }

      toast({ title: action === "approved" ? "Bill approved!" : "Bill rejected" });
      navigate("/approvals");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!bill) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Bill not found.</div>
      </AppLayout>
    );
  }

  const canApprove = approvals.some((a) => a.is_active && a.status === "pending" && a.approver_role === role);
  const imageUrl = getImageUrl();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{bill.vendor_name}</h1>
            <p className="text-muted-foreground">₹{bill.amount.toLocaleString()} · {format(new Date(bill.bill_date), "dd MMM yyyy")}</p>
          </div>
          <Badge className={`text-sm ${statusColors[bill.status]}`}>{bill.status.replace("_", " ").toUpperCase()}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bill Image */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Bill Image</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {imageUrl ? (
                <div className="overflow-auto max-h-[500px] rounded-lg border bg-muted/30">
                  <img src={imageUrl} alt="Bill" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }} className="transition-transform" />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-lg">No image available</div>
              )}
            </CardContent>
          </Card>

          {/* Details + Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Category</span><p className="font-medium capitalize">{bill.category.replace("_", " ")}</p></div>
                  <div><span className="text-muted-foreground">Amount</span><p className="font-medium">₹{bill.amount.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Bill Date</span><p className="font-medium">{format(new Date(bill.bill_date), "dd MMM yyyy")}</p></div>
                  <div><span className="text-muted-foreground">Uploaded</span><p className="font-medium">{format(new Date(bill.created_at), "dd MMM yyyy HH:mm")}</p></div>
                </div>
                {bill.description && (
                  <div className="text-sm"><span className="text-muted-foreground">Description</span><p>{bill.description}</p></div>
                )}
              </CardContent>
            </Card>

            {/* Approval Actions */}
            {canApprove && (
              <Card className="border-primary/30">
                <CardHeader><CardTitle className="text-lg">Your Decision</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea placeholder="Add a comment (optional)..." value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApproval("approved")} disabled={processing}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleApproval("rejected")} disabled={processing}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approval Timeline */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Approval Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvals.map((a, i) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          a.status === "approved" ? "bg-green-100 text-green-700" :
                          a.status === "rejected" ? "bg-red-100 text-red-700" :
                          a.is_active ? "bg-blue-100 text-blue-700 animate-pulse" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {a.status === "approved" ? "✓" : a.status === "rejected" ? "✗" : i + 1}
                        </div>
                        {i < approvals.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">{roleLabels[a.approver_role]}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.status === "pending" && a.is_active && "Awaiting decision..."}
                          {a.status === "pending" && !a.is_active && "Waiting for previous approval"}
                          {a.status === "approved" && `Approved${a.action_timestamp ? ` on ${format(new Date(a.action_timestamp), "dd MMM HH:mm")}` : ""}`}
                          {a.status === "rejected" && `Rejected${a.action_timestamp ? ` on ${format(new Date(a.action_timestamp), "dd MMM HH:mm")}` : ""}`}
                        </p>
                        {a.comments && <p className="text-xs mt-1 italic text-muted-foreground">"{a.comments}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Audit Trail */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Audit Trail</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {log.action === "uploaded" ? <Clock className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{profiles[log.performed_by] || "Unknown"}</span>
                      {log.user_role && <Badge variant="outline" className="ml-1 text-[10px]">{roleLabels[log.user_role]}</Badge>}
                      {" "}<span className="capitalize">{log.action}</span> this bill
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
