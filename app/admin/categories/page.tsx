"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Droplets,
  Flame,
  ShieldAlert,
  HeartPulse,
  Wrench,
  Package,
  Home,
  Zap,
  CloudRain,
  Wind,
  Thermometer,
  Baby,
  Pill,
  Stethoscope,
  Car,
  Truck,
  Wifi,
  Radio,
  AlertTriangle,
  BellRing,
  Footprints,
  Tent,
  Trees,
  Leaf,
  Bug,
  Fish,
  Wheat,
  Milk,
  Apple,
  Beef,
  Shirt,
  BookOpen,
  GraduationCap,
  Building2,
  Factory,
  HandHelping,
  Users,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// ── Expanded icon registry ──────────────────────────────────────────────────
const ALL_ICONS = [
  { name: "Droplets", icon: Droplets, label: "Water" },
  { name: "Flame", icon: Flame, label: "Fire" },
  { name: "ShieldAlert", icon: ShieldAlert, label: "Alert" },
  { name: "HeartPulse", icon: HeartPulse, label: "Medical" },
  { name: "Wrench", icon: Wrench, label: "Repair" },
  { name: "Package", icon: Package, label: "Supply" },
  { name: "Home", icon: Home, label: "Shelter" },
  { name: "Zap", icon: Zap, label: "Electric" },
  { name: "CloudRain", icon: CloudRain, label: "Flood" },
  { name: "Wind", icon: Wind, label: "Storm" },
  { name: "Thermometer", icon: Thermometer, label: "Climate" },
  { name: "Baby", icon: Baby, label: "Child" },
  { name: "Pill", icon: Pill, label: "Medicine" },
  { name: "Stethoscope", icon: Stethoscope, label: "Health" },
  { name: "Car", icon: Car, label: "Transport" },
  { name: "Truck", icon: Truck, label: "Logistics" },
  { name: "Wifi", icon: Wifi, label: "Comms" },
  { name: "Radio", icon: Radio, label: "Signal" },
  { name: "AlertTriangle", icon: AlertTriangle, label: "Warning" },
  { name: "BellRing", icon: BellRing, label: "Alarm" },
  { name: "Footprints", icon: Footprints, label: "Movement" },
  { name: "Tent", icon: Tent, label: "Camp" },
  { name: "Trees", icon: Trees, label: "Forest" },
  { name: "Leaf", icon: Leaf, label: "Nature" },
  { name: "Bug", icon: Bug, label: "Pest" },
  { name: "Fish", icon: Fish, label: "Fishery" },
  { name: "Wheat", icon: Wheat, label: "Crops" },
  { name: "Milk", icon: Milk, label: "Dairy" },
  { name: "Apple", icon: Apple, label: "Food" },
  { name: "Beef", icon: Beef, label: "Meat" },
  { name: "Shirt", icon: Shirt, label: "Clothing" },
  { name: "BookOpen", icon: BookOpen, label: "Education" },
  { name: "GraduationCap", icon: GraduationCap, label: "School" },
  { name: "Building2", icon: Building2, label: "Building" },
  { name: "Factory", icon: Factory, label: "Industry" },
  { name: "HandHelping", icon: HandHelping, label: "Aid" },
  { name: "Users", icon: Users, label: "Community" },
];

function getIconComponent(name: string) {
  return ALL_ICONS.find((i) => i.name === name)?.icon || ShieldAlert;
}

export default function CategorySettings() {
  const categories = useQuery(api.reports.listCategories);
  const addCategory = useMutation(api.reports.addCategory);
  const deleteCategory = useMutation(api.reports.deleteCategory);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("ShieldAlert");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"categories"> | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [showAllIcons, setShowAllIcons] = useState(false);

  const filteredIcons = useMemo(() => {
    const q = iconSearch.toLowerCase();
    return q
      ? ALL_ICONS.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.name.toLowerCase().includes(q)
        )
      : ALL_ICONS;
  }, [iconSearch]);

  // Show 12 icons initially, expand on demand
  const visibleIcons = showAllIcons ? filteredIcons : filteredIcons.slice(0, 12);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    try {
      await addCategory({ name: name.trim(), icon, description: description.trim() });
      setName("");
      setDescription("");
      toast.success("New response category operational");
    } catch {
      toast.error("Failed to register category");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: Id<"categories">, catName: string) => {
    if (
      !confirm(
        `Delete category "${catName}"? Reports using this category will keep their data.`
      )
    )
      return;
    setDeletingId(id);
    try {
      await deleteCategory({ id });
      toast.success(`Category "${catName}" removed.`);
    } catch {
      toast.error("Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  const SelectedIcon = getIconComponent(icon);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight italic uppercase">
            Category Control
          </h1>
          <p className="text-muted-foreground font-medium italic">
            Define and customize emergency response types for field coordination.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Add Form ──────────────────────────────── */}
        <Card className="lg:col-span-1 rounded-3xl border-none shadow-2xl bg-card p-8 h-fit">
          <form onSubmit={handleAdd} className="space-y-5">
            {/* Category Name */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Category Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Medical Relief"
                className="rounded-2xl bg-muted/50 border-none h-12 font-bold"
                required
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pick an Icon
                </Label>
                {/* Selected preview */}
                <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-1.5">
                  <SelectedIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {icon}
                  </span>
                </div>
              </div>

              {/* Icon search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={iconSearch}
                  onChange={(e) => {
                    setIconSearch(e.target.value);
                    setShowAllIcons(true);
                  }}
                  placeholder="Search icons..."
                  className="pl-8 rounded-xl bg-muted/50 border-none h-9 text-xs font-bold"
                />
              </div>

              {/* Icon grid */}
              <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {visibleIcons.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    title={opt.label}
                    onClick={() => setIcon(opt.name)}
                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      icon === opt.name
                        ? "bg-indigo-600 text-white shadow-lg scale-105"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-slate-600"
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase leading-none truncate w-full text-center">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Show more / less toggle */}
              {!iconSearch && filteredIcons.length > 12 && (
                <button
                  type="button"
                  onClick={() => setShowAllIcons((v) => !v)}
                  className="w-full flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-indigo-600 transition-colors py-1"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showAllIcons ? "rotate-180" : ""}`}
                  />
                  {showAllIcons
                    ? "Show Less"
                    : `Show All ${filteredIcons.length} Icons`}
                </button>
              )}

              {filteredIcons.length === 0 && (
                <p className="text-center text-[10px] text-slate-300 italic py-4">
                  No icons match your search.
                </p>
              )}
            </div>

            {/* Guidelines */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Guidelines (Optional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short protocol summary..."
                className="rounded-2xl bg-muted/50 border-none h-12 font-bold"
              />
            </div>

            <Button
              disabled={isAdding || !name.trim()}
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black uppercase text-xs tracking-widest gap-2 shadow-xl disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Activate Category
            </Button>
          </form>
        </Card>

        {/* ── Category Registry ─────────────────────── */}
        <Card className="lg:col-span-2 rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
          <div className="bg-muted/50 p-6 flex items-center justify-between border-b border-border">
            <h3 className="text-sm font-black uppercase tracking-tighter text-slate-600">
              Active Registry
            </h3>
            <span className="text-[10px] font-black leading-none py-1 px-3 border border-border uppercase tracking-widest rounded-full text-muted-foreground bg-card">
              {categories?.length || 0} Registered
            </span>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories?.map((cat) => {
              const IconComp = getIconComponent(cat.icon);
              return (
                <div
                  key={cat._id}
                  className="p-4 rounded-3xl border border-border flex items-center gap-4 group hover:border-red-100 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium truncate italic">
                      {cat.description || "No specific mission protocol."}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === cat._id}
                    onClick={() =>
                      handleDelete(cat._id as Id<"categories">, cat.name)
                    }
                    className="rounded-xl opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 disabled:opacity-40"
                  >
                    {deletingId === cat._id ? (
                      <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin block" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })}
            {categories?.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-300 italic font-medium">
                No custom categories deployed yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

