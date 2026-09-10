@@
   const session = useQuery({
     queryKey: ["get-started", "session"],
     queryFn: async () => {
       const { data } = await supabase.auth.getUser();
       if (!data.user)
         return { userId: null as string | null, organizationId: null as string | null };
       const { data: membership } = await supabase
         .from("memberships")
         .select("organization_id, role")
         .eq("user_id", data.user.id)
         .order("created_at", { ascending: true })
         .limit(1)
         .maybeSingle();
       // Already paying? The Pay button must never lead into a Stripe iframe
       // that can only fail with "workspace already has a subscription".
       let hasActiveSubscription = false;
       if (membership?.organization_id) {
         // Only a real (live) Stripe subscription counts as "already paying" —
         // sandbox rows must never block a real customer's checkout.
         const { data: subs } = await supabase
           .from("subscriptions")
           .select("status")
           .eq("organization_id", membership.organization_id)
           .eq("payment_provider", "stripe")
           .eq("environment", "live")
           .in("status", ["active", "trialing"])
           .limit(1);
         hasActiveSubscription = (subs ?? []).length > 0;
       }
       return {
         userId: data.user.id,
         organizationId: membership?.organization_id ?? null,
         email: data.user.email ?? null,
         hasActiveSubscription,
       };
     },
   });
+
+  // The org may already have everything Revora needs (from a prior session, a
+  // different device, or the dashboard's own business-info panel) — reuse it
+  // instead of asking the client to retype their business details.
+  const profileQuery = useQuery({
+    queryKey: ["get-started", "profile", session.data?.organizationId],
+    enabled: Boolean(session.data?.organizationId),
+    queryFn: async () => {
+      const orgId = session.data!.organizationId!;
+      const [{ data: org }, { data: profile }] = await Promise.all([
+        supabase.from("organizations").select("name, industry").eq("id", orgId).maybeSingle(),
+        supabase
+          .from("business_profiles")
+          .select("owner_name, owner_email, email, phone, website, city, state, description")
+          .eq("organization_id", orgId)
+          .maybeSingle(),
+      ]);
+      return { org, profile };
+    },
+  });
@@
   useEffect(() => {
     if (session.data?.organizationId) setOrganizationId(session.data.organizationId);
   }, [session.data?.organizationId]);
+
+  // Fill in anything the org already has on file — never overwrite something
+  // the client already typed (or restored from a saved draft) this session.
+  useEffect(() => {
+    if (!profileQuery.data) return;
+    const { org, profile } = profileQuery.data;
+    setIntake((prev) => ({
+      fullName: prev.fullName || profile?.owner_name || "",
+      businessName: prev.businessName || org?.name || "",
+      email: prev.email || profile?.owner_email || profile?.email || "",
+      phone: prev.phone || profile?.phone || "",
+      website: prev.website || profile?.website || "",
+      businessType: prev.businessType || org?.industry || "",
+      city: prev.city || profile?.city || "",
+      state: prev.state || profile?.state || "",
+      services: prev.services || profile?.description || "",
+    }));
+  }, [profileQuery.data]);
+
+  // Everything required is already on file — skip straight to payment
+  // instead of re-asking for it. Still editable: "Edit information" goes back.
+  useEffect(() => {
+    if (step !== 0 || !profileQuery.data || missing.length) return;
+    setStep(2);
+  }, [step, profileQuery.data, missing]);
