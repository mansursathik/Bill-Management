import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckSquare, IndianRupee, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function Dashboard() {
  const { user, role, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, totalAmount: 0 });
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || !role) return;

    const fetchData = async () => {
      let billQuery = supabase.from("bills").select("*");
      if (role === "employee") billQuery = billQuery.eq("created_by", user.id);

      const { data: bills } = await billQuery;
      const allBills = bills || [];

      setStats({
        total: allBills.length,
        pending: allBills.filter((b) => b.status === "pending" || b.status === "under_review").length,
        approved: allBills.filter((b) => b.status === "approved").length,
        totalAmount: allBills.reduce((s, b) => s + Number(b.amount), 0),
      });

      // Recent bills
      const { data: recent } = await supabase.from("bills").select("*")
        .order("created_at", { ascending: false })
        .limit(5)
        .then((res) => {
          if (role === "employee") {
            return supabase.from("bills").select("*").eq("created_by", user.id).order("created_at", { ascending: false }).limit(5);
          }
          return res;
        });
      setRecentBills(recent || []);

      // Pending approvals for approvers
      if (role !== "employee") {
        const { data: pendingApps } = await supabase.from("approvals")
          .select("id")
          .eq("approver_role", role)
          .eq("is_active", true)
          .eq("status", "pending");
        setPendingCount(pendingApps?.length || 0);
      }
    };
    fetchData();
  }, [user, role]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name || "User"}</h1>
          <p className="text-muted-foreground text-sm">Here's your expense overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-xl font-bold">₹{stats.totalAmount.toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-xs text-muted-foreground">Total Bills</p><p className="text-xl font-bold">{stats.total}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock className="h-5 w-5 text-yellow-600" /></div>
                <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{stats.pending}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-bold">{stats.approved}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {role === "employee" && (
            <Button asChild><Link to="/bills/upload"><Upload className="h-4 w-4 mr-1" /> Upload New Bill</Link></Button>
          )}
          {role !== "employee" && pendingCount > 0 && (
            <Button asChild>
              <Link to="/approvals">
                <CheckSquare className="h-4 w-4 mr-1" /> Review {pendingCount} Pending
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild><Link to="/bills"><FileText className="h-4 w-4 mr-1" /> View All Bills</Link></Button>
          <Button variant="outline" asChild><Link to="/analytics"><TrendingUp className="h-4 w-4 mr-1" /> Analytics</Link></Button>
        </div>

        {/* Recent Bills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Bills</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bills">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBills.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No bills yet.</p>
            ) : (
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <Link key={bill.id} to={`/bills/${bill.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{bill.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(bill.created_at), "dd MMM yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">₹{Number(bill.amount).toLocaleString()}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[bill.status]}`}>
                        {bill.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
