import {
  LayoutDashboard,
  Upload,
  FileText,
  CheckSquare,
  BarChart3,
  User,
  LogOut,
  Receipt,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const menuItems = {
  employee: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Upload Bill", url: "/bills/upload", icon: Upload },
    { title: "My Bills", url: "/bills", icon: FileText },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  accounts: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "All Bills", url: "/bills", icon: FileText },
    { title: "Pending Approvals", url: "/approvals", icon: CheckSquare },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  manager: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Pending Approvals", url: "/approvals", icon: CheckSquare },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  md: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "All Bills", url: "/bills", icon: FileText },
    { title: "Pending Approvals", url: "/approvals", icon: CheckSquare },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
};

const roleLabels: Record<string, string> = {
  employee: "Employee",
  accounts: "Accounts",
  manager: "Manager",
  md: "Managing Director",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, profile, signOut } = useAuth();

  const items = menuItems[role || "employee"];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {!collapsed && <span className="font-bold text-sm">ExpenseFlow</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="text-xs text-sidebar-foreground/70 truncate">{profile?.email}</div>
            <Badge variant="outline" className="mt-1 text-[10px] border-sidebar-primary/30 text-sidebar-primary">
              {roleLabels[role || "employee"]}
            </Badge>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/profile" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent">
                <User className="mr-2 h-4 w-4" />
                {!collapsed && <span>Profile</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-destructive/20 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
