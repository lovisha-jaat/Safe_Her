import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Phone, Trash2, Star, GripVertical, UserPlus } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

const LEGACY_CONTACTS_KEY_PREFIX = "safeher.contacts.";

const EmergencyContacts = () => {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const localKey = user ? `${LEGACY_CONTACTS_KEY_PREFIX}${user.id}` : null;

  const readLocalContacts = (): Contact[] => {
    if (!localKey) return [];
    try {
      const raw = localStorage.getItem(localKey);
      const parsed = raw ? (JSON.parse(raw) as Contact[]) : [];
      return parsed.map((c, i) => ({
        id: c.id || `local-${Date.now()}-${i}`,
        name: c.name ?? "",
        phone: c.phone ?? "",
        relation: c.relation ?? "",
        isPrimary: !!c.isPrimary,
      }));
    } catch {
      return [];
    }
  };

  const writeLocalContacts = (next: Contact[]) => {
    if (!localKey) return;
    localStorage.setItem(localKey, JSON.stringify(next));
  };

  // Load contacts from Supabase when user is available
  useEffect(() => {
    if (!user) return;
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("id,name,phone,relation,is_primary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        const local = readLocalContacts();
        setContacts(local);
        setUseLocalFallback(true);
        toast.warning("Using local contacts mode");
      } else {
        const mapped = (data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          relation: c.relation ?? "",
          isPrimary: c.is_primary,
        }));
        setContacts(mapped);
        writeLocalContacts(mapped);
        setUseLocalFallback(false);
      }
      setLoaded(true);
    };
    fetchContacts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");

  const addContact = async () => {
    if (!newName || !newPhone || !user) return;

    const localContact: Contact = {
      id: `local-${Date.now()}`,
      name: newName,
      phone: newPhone,
      relation: newRelation,
      isPrimary: false,
    };

    // If backend is unavailable, keep working with local contacts.
    if (useLocalFallback) {
      const next = [...contacts, localContact];
      setContacts(next);
      writeLocalContacts(next);
      setNewName("");
      setNewPhone("");
      setNewRelation("");
      setShowAdd(false);
      toast.success("Contact added (local mode)");
      return;
    }

    const { data, error } = await supabase
      .from("emergency_contacts")
      .insert({
        user_id: user.id,
        name: newName,
        phone: newPhone,
        relation: newRelation || null,
        is_primary: false,
      })
      .select("id,name,phone,relation,is_primary")
      .single();

    if (error || !data) {
      // Fall back to local and keep user unblocked.
      const next = [...contacts, localContact];
      setContacts(next);
      writeLocalContacts(next);
      setUseLocalFallback(true);
      toast.warning("Saved contact locally (server unavailable)");
      setNewName("");
      setNewPhone("");
      setNewRelation("");
      setShowAdd(false);
      return;
    }

    const next = [
      ...contacts,
      {
        id: data.id,
        name: data.name,
        phone: data.phone,
        relation: data.relation ?? "",
        isPrimary: data.is_primary,
      },
    ];
    setContacts(next);
    writeLocalContacts(next);
    setNewName("");
    setNewPhone("");
    setNewRelation("");
    setShowAdd(false);
    toast.success("Contact added");
  };

  const removeContact = async (id: string) => {
    const next = contacts.filter((c) => c.id !== id);

    if (!useLocalFallback) {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) {
        setUseLocalFallback(true);
        toast.warning("Removed in local mode (server unavailable)");
      }
    }

    setContacts(next);
    writeLocalContacts(next);
  };

  const togglePrimary = async (id: string) => {
    if (!user) return;
    const target = contacts.find((c) => c.id === id);
    if (!target) return;
    const nextPrimary = !target.isPrimary;
    const next = contacts.map((c) => ({ ...c, isPrimary: c.id === id ? nextPrimary : false }));

    if (!useLocalFallback) {
      const { error: clearError } = await supabase
        .from("emergency_contacts")
        .update({ is_primary: false })
        .eq("user_id", user.id);
      if (clearError) {
        setUseLocalFallback(true);
        setContacts(next);
        writeLocalContacts(next);
        toast.warning("Primary updated in local mode");
        return;
      }

      if (nextPrimary) {
        const { error: setError } = await supabase
          .from("emergency_contacts")
          .update({ is_primary: true })
          .eq("id", id)
          .eq("user_id", user.id);
        if (setError) {
          setUseLocalFallback(true);
          setContacts(next);
          writeLocalContacts(next);
          toast.warning("Primary updated in local mode");
          return;
        }
      }
    }

    setContacts(next);
    writeLocalContacts(next);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Emergency Contacts</h1>
            <p className="text-muted-foreground text-sm">People who'll be notified in emergencies</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* Add new contact form */}
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-card rounded-2xl p-4 shadow-card mb-4 space-y-3"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contact Name"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone Number"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              value={newRelation}
              onChange={(e) => setNewRelation(e.target.value)}
              placeholder="Relationship (e.g., Sister)"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={addContact}
              disabled={!newName || !newPhone}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-soft disabled:opacity-50"
            >
              Add Contact
            </button>
          </motion.div>
        )}

        {/* Info */}
        <div className="bg-primary/5 rounded-2xl p-3 mb-4 flex items-start gap-3">
          <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> Star contacts to set them as priority. They'll be notified first during emergencies.
          </p>
        </div>

        {/* Empty state */}
        {loaded && contacts.length === 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-card text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-card-foreground mb-1">No contacts yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Add trusted people who'll be notified during emergencies
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-soft"
            >
              Add your first contact
            </button>
          </div>
        )}

        {/* Contacts list */}
        <div className="space-y-2">
          {contacts.map((contact, i) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary-foreground">{contact.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-card-foreground">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.phone}</p>
                <p className="text-[10px] text-primary font-medium">{contact.relation}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => togglePrimary(contact.id)} className="p-2">
                  <Star
                    className={`w-4 h-4 ${contact.isPrimary ? "text-moderate fill-moderate" : "text-muted-foreground"}`}
                  />
                </button>
                <a href={`tel:${contact.phone}`} className="p-2">
                  <Phone className="w-4 h-4 text-safe" />
                </a>
                <button onClick={() => removeContact(contact.id)} className="p-2">
                  <Trash2 className="w-4 h-4 text-unsafe" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <SOSButton />
      <BottomNav />
    </div>
  );
};

export default EmergencyContacts;
