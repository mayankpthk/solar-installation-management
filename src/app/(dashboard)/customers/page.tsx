"use client";

import * as React from "react";
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { getStore } from "@/lib/data/store";
import { Customer } from "@/lib/types/database";

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  // Form state
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("Jalandhar");
  const [pincode, setPincode] = React.useState("144001");

  const loadData = React.useCallback(() => {
    const store = getStore();
    setCustomers([...store.customers]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      toast({
        title: "Validation Error",
        description: "Customer Name and Phone Number are required.",
        variant: "error",
      });
      return;
    }

    const store = getStore();
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      organization_id: "00000000-0000-0000-0000-000000000001",
      customer_code: `CUST-2026-${String(store.customers.length + 1).padStart(4, "0")}`,
      full_name: fullName,
      phone,
      email: email || undefined,
      address,
      city,
      state: "Punjab",
      pincode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.customers.unshift(newCustomer);
    loadData();
    setIsAddOpen(false);

    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");

    toast({
      title: "Customer Account Created",
      description: `${fullName} (${newCustomer.customer_code}) registered in database.`,
      variant: "success",
    });
  };

  const columns: Column<Customer>[] = [
    {
      header: "Customer Name & Code",
      accessorKey: "full_name",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground">{row.full_name}</p>
          <p className="text-[11px] font-mono text-muted-foreground">{row.customer_code}</p>
        </div>
      ),
    },
    {
      header: "Contact Details",
      accessorKey: "phone",
      cell: (row) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1 font-mono text-foreground font-medium">
            <Phone className="w-3 h-3 text-primary" /> {row.phone}
          </p>
          {row.email && (
            <p className="flex items-center gap-1 truncate max-w-[200px]">
              <Mail className="w-3 h-3 text-muted-foreground" /> {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Location",
      accessorKey: "city",
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" /> {row.city}, {row.state}
          </p>
          <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{row.address}</p>
        </div>
      ),
    },
    {
      header: "Joined Date",
      accessorKey: "created_at",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "360 View",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-primary/40 hover:bg-primary/10 text-primary font-semibold"
          onClick={() => setSelectedCustomer(row)}
        >
          Customer 360
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Customer 360 Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Centralized directory of verified rooftop solar homeowners and commercial clients.
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      {/* Customer Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold">Client Directory</CardTitle>
          <CardDescription className="text-xs">
            Review customer profiles, contact information, and connected solar assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={customers}
            columns={columns}
            searchPlaceholder="Search by name, phone, code, city..."
          />
        </CardContent>
      </Card>

      {/* Add Customer Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
            <DialogDescription>
              Create a permanent account record for solar billing, dispatches, and warranty tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Full Name *</label>
              <Input
                placeholder="e.g. Harpreet Kaur"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Phone Number *</label>
                <Input
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Street Address</label>
              <Input
                placeholder="House / Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Pincode</label>
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer 360 Detail Modal */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedCustomer.full_name}</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {selectedCustomer.customer_code}
                </span>
              </DialogTitle>
              <DialogDescription>
                Complete customer profile and installed rooftop solar systems.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
                <p className="font-bold text-foreground uppercase tracking-wide text-[11px]">Contact & Address</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <p><strong className="text-foreground">Phone:</strong> {selectedCustomer.phone}</p>
                  <p><strong className="text-foreground">Email:</strong> {selectedCustomer.email || "N/A"}</p>
                  <p><strong className="text-foreground">City:</strong> {selectedCustomer.city}, {selectedCustomer.state}</p>
                  <p><strong className="text-foreground">Pincode:</strong> {selectedCustomer.pincode}</p>
                </div>
                <p className="text-muted-foreground"><strong className="text-foreground">Street:</strong> {selectedCustomer.address}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Active Warranty Certificates
                  </p>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded font-mono">
                    2 Year Inverter / 20 Year Panels
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  All warranty clocks are tracked continuously and tied directly to verified serial numbers.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
