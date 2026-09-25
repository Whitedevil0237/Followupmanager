Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const notes: string = body.notes ?? "";
    const clientName: string = body.clientName ?? "the client";
    const clientCode: string = body.clientCode ?? "";

    if (!notes.trim()) {
      return new Response(
        JSON.stringify({ error: "Conversation notes are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lower = notes.toLowerCase();

    // --- Split notes into sentences ---
    const sentences = notes
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    // --- Categorize sentences by what they describe ---
    const completedPatterns = [
      "done", "completed", "finished", "installed", "configured", "trained",
      "successfully", "resolved", "fixed", "delivered", "set up", "updated",
      "upgraded", "integrated", "working", "activated", "enabled", "deployed",
      "launched", "live", "ready", "handed over", "provided", "shared",
    ];
    const actionPatterns = [
      "need to", "will", "should", "must", "plan to", "next", "follow up",
      "send", "schedule", "prepare", "draft", "review", "check", "confirm",
      "verify", "ensure", "arrange", "coordinate", "pending", "awaiting",
      "waiting", "to do", "todo", "remind", "contact", "call back",
      "get back", "share with", "escalate",
    ];

    const isCompleted = (s: string) =>
      completedPatterns.some((p) => s.toLowerCase().includes(p)) &&
      !actionPatterns.some((p) => s.toLowerCase().includes(p));
    const isAction = (s: string) =>
      actionPatterns.some((p) => s.toLowerCase().includes(p));

    const completedSentences = sentences.filter(isCompleted);
    const actionSentences = sentences.filter(isAction);
    const otherSentences = sentences.filter(
      (s) => !isCompleted(s) && !isAction(s)
    );

    // --- Build a summary from the actual notes content ---
    const summaryParts: string[] = [];
    if (completedSentences.length > 0) {
      summaryParts.push(completedSentences.join(". ") + ".");
    }
    if (otherSentences.length > 0) {
      summaryParts.push(otherSentences.join(". ") + ".");
    }
    const summaryContent =
      summaryParts.length > 0
        ? summaryParts.join(" ")
        : sentences.length > 0
          ? sentences.join(". ") + "."
          : notes.trim();

    // --- Detect sentiment from actual words ---
    const sentimentWords = [
      "happy", "great", "excited", "pleased", "positive", "looking forward",
      "thrilled", "satisfied", "glad", "thankful", "appreciate",
    ];
    const concernWords = [
      "concern", "worried", "frustrated", "unhappy", "issue", "hesitant",
      "unsure", "problem", "complaint", "difficult", "not happy", "angry",
    ];
    let sentiment: "positive" | "concern" | "neutral" = "neutral";
    if (sentimentWords.some((w) => lower.includes(w))) sentiment = "positive";
    else if (concernWords.some((w) => lower.includes(w))) sentiment = "concern";

    // --- Detect urgency ---
    const isUrgent =
      lower.includes("urgent") ||
      lower.includes("asap") ||
      lower.includes("immediately") ||
      lower.includes("right away") ||
      lower.includes("critical");

    // --- Detect deadline mentions ---
    const dateMatch = notes.match(
      /\b(next week|tomorrow|by friday|by monday|end of (?:this )?week|end of month|this month|today|this week)\b/i,
    );

    // --- Build action items from actual notes ---
    const actions: string[] = [];
    actionSentences.forEach((s) => {
      // Clean up: capitalize first letter, ensure it ends with a period
      let clean = s.charAt(0).toUpperCase() + s.slice(1);
      if (!clean.endsWith(".")) clean += ".";
      actions.push(clean);
    });

    // If no explicit action sentences were found, derive from context
    if (actions.length === 0) {
      if (completedSentences.length > 0) {
        actions.push(
          `Confirm with ${clientName} that the completed work meets their expectations.`
        );
      }
      actions.push(`Schedule a follow-up check-in with ${clientName} in 1-2 weeks.`);
    }

    const aiSummary = `Conversation with ${clientName}: ${summaryContent}`;
    const aiActions = actions.join("\n");

    // --- Build WhatsApp message from actual conversation content ---
    const hour = new Date().getHours();
    let greeting = "Hello";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else greeting = "Good evening";

    const firstName = clientName.split(" ")[0];

    const waLines: string[] = [];
    waLines.push(`${greeting} ${firstName},`);
    waLines.push("");
    // Use the actual notes content as the message body
    waLines.push(summaryContent);
    waLines.push("");
    // Add next steps if any were discussed
    if (actionSentences.length > 0) {
      waLines.push("As next steps:");
      actionSentences.slice(0, 3).forEach((a) => {
        let clean = a.charAt(0).toUpperCase() + a.slice(1);
        if (!clean.endsWith(".")) clean += ".";
        waLines.push(`• ${clean}`);
      });
      waLines.push("");
    }
    // Closing based on sentiment
    if (sentiment === "positive") {
      waLines.push("It's a pleasure working with you. Feel free to reach out anytime!");
    } else if (sentiment === "concern") {
      waLines.push("I want to assure you we're on top of this. I'll follow up shortly with updates.");
    } else {
      waLines.push("Please let me know if you have any questions.");
    }
    waLines.push("");
    waLines.push("Best regards,");

    const whatsappMessage = waLines.join("\n");

    // --- Build Task Manager comment from actual content ---
    const taskLines: string[] = [];
    const clientRef = clientCode ? `${clientName} (${clientCode})` : clientName;
    taskLines.push(`📋 FOLLOW-UP TASK — ${clientRef}`);
    taskLines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
    taskLines.push("");
    taskLines.push(`SUMMARY: ${summaryContent}`);
    taskLines.push("");
    taskLines.push(`PRIORITY: ${isUrgent ? "🔴 HIGH" : "🟡 MEDIUM"}`);
    taskLines.push("");
    taskLines.push("ACTION ITEMS:");
    actions.forEach((a) => {
      taskLines.push(`  [ ] ${a}`);
    });
    taskLines.push("");
    taskLines.push(
      `DEADLINE: ${dateMatch ? dateMatch[1].toLowerCase() : "3 days from now"}`
    );
    taskLines.push("");
    if (completedSentences.length > 0) {
      taskLines.push(`COMPLETED:`);
      completedSentences.forEach((s) => {
        taskLines.push(`  [x] ${s}.`);
      });
      taskLines.push("");
    }
    taskLines.push(`SENTIMENT: ${sentiment.toUpperCase()}`);

    const taskComment = taskLines.join("\n");

    // Suggest a follow-up date (3 days from now) and time slot
    const followupDate = new Date();
    followupDate.setDate(followupDate.getDate() + 3);
    const suggestedDate = followupDate.toISOString().split("T")[0];
    const suggestedTime = "10:00 AM";

    return new Response(
      JSON.stringify({
        summary: aiSummary,
        actions: aiActions,
        actionList: actions,
        suggestedDate,
        suggestedTime,
        topics: [],
        whatsappMessage,
        taskComment,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to generate follow-up." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
