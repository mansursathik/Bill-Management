import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, CheckSquare } from "lucide-react";
import { format } from "date-fns";

export default function Approvals() {
  const { role } = useAuth();
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      if (!role) return;

      const { data: approvalData } = await supabase
        .from("approvals")
        .select("bill_id")
        .eq("approver_role", role)
        .eq("is_active", true)
        .eq("status", "pending");

      if (!approvalData || approvalData.length === 0) {
        setPendingBills([]);
        setLoading(false);
        return;
      }

      const billIds = approvalData.map((a) => a.bill_id);
      const { data: bills } = await supabase
        .from("bills")
        .select("*")
        .in("id", billIds)
        .order("created_at", { ascending: false });

      setPendingBills(bills || []);
      setLoading(false);
    };
    fetchPending();
  }, [role]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6" /> Pending Approvals
          </h1>
          <p className="text-muted-foreground text-sm">{pendingBills.length} bills awaiting your approval</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : pendingBills.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No pending approvals. You're all caught up!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.vendor_name}</TableCell>
                      <TableCell>₹{bill.amount.toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell">{format(new Date(bill.bill_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{bill.category.replace("_", " ")}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link to={`/bills/${bill.id}`}><Eye className="h-4 w-4 mr-1" /> Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
