import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, TrendingUp, Clock, CheckCircle, IndianRupee } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfMonth, endOfMonth, parseISO, differenceInHours } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

const COLORS = [
  "hsl(230, 70%, 50%)", "hsl(160, 60%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)",
  "hsl(270, 60%, 50%)", "hsl(190, 70%, 45%)", "hsl(330, 60%, 50%)", "hsl(50, 80%, 45%)",
];

export default function Analytics() {
  const { user, role } = useAuth();
  const [bills, setBills] = useState<Tables<"bills">[]>([]);
  const [approvals, setApprovals] = useState<Tables<"approvals">[]>([]);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      let billQuery = supabase.from("bills").select("*").gte("bill_date", dateFrom).lte("bill_date", dateTo);
      if (role === "employee") billQuery = billQuery.eq("created_by", user!.id);

      const [billRes, appRes] = await Promise.all([
        billQuery,
        supabase.from("approvals").select("*"),
      ]);
      setBills(billRes.data || []);
      setApprovals(appRes.data || []);
      setLoading(false);
    };
    if (user) fetch();
  }, [user, role, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = bills.reduce((s, b) => s + Number(b.amount), 0);
    const pending = bills.filter((b) => b.status === "pending" || b.status === "under_review").length;
    const approved = bills.filter((b) => b.status === "approved").length;
    const approvalRate = bills.length ? Math.round((approved / bills.length) * 100) : 0;

    // Avg approval time
    const approvedBills = bills.filter((b) => b.status === "approved");
    const avgTime = approvedBills.length > 0
      ? Math.round(approvedBills.reduce((s, b) => {
          const relApprovals = approvals.filter((a) => a.bill_id === b.id && a.status === "approved" && a.action_timestamp);
          const lastApproval = relApprovals.sort((a, b) => new Date(b.action_timestamp!).getTime() - new Date(a.action_timestamp!).getTime())[0];
          return s + (lastApproval ? differenceInHours(new Date(lastApproval.action_timestamp!), new Date(b.created_at)) : 0);
        }, 0) / approvedBills.length)
      : 0;

    return { total, pending, approved, approvalRate, avgTime };
  }, [bills, approvals]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    bills.forEach((b) => { map[b.category] = (map[b.category] || 0) + Number(b.amount); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [bills]);

  const vendorData = useMemo(() => {
    const map: Record<string, number> = {};
    bills.forEach((b) => { map[b.vendor_name] = (map[b.vendor_name] || 0) + Number(b.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [bills]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    bills.forEach((b) => {
      const month = format(parseISO(b.bill_date), "MMM yyyy");
      map[month] = (map[month] || 0) + Number(b.amount);
    });
    return Object.entries(map).map(([month, total]) => ({ month, total }));
  }, [bills]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" /> Analytics
            </h1>
            <p className="text-muted-foreground text-sm">{role === "employee" ? "Your expense overview" : "Organization-wide analytics"}</p>
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-xl font-bold">₹{stats.total.toLocaleString()}</p></div>
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
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-xs text-muted-foreground">Approval Rate</p><p className="text-xl font-bold">{stats.approvalRate}%</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-xs text-muted-foreground">Avg Approval Time</p><p className="text-xl font-bold">{stats.avgTime}h</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Category Breakdown</CardTitle></CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data for selected period</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Vendors</CardTitle></CardHeader>
            <CardContent>
              {vendorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vendorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="hsl(230, 70%, 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data for selected period</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Monthly Trend</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="total" stroke="hsl(230, 70%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data for selected period</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
