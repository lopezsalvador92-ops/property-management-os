const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ACTIVITY_LOGS_TABLE = "tblr0LqK8DMptTnDN";

export type ActivityLogEntry = {
  action:
    | "user.created"
    | "user.updated"
    | "user.role_changed"
    | "user.property_changed"
    | "user.password_reset"
    | "user.deleted"
    | "user.first_login_password_set";
  actorEmail?: string;
  actorRole?: string;
  targetEmail?: string;
  targetRole?: string;
  summary: string;
  details?: string;
};

export async function writeActivityLog(entry: ActivityLogEntry): Promise<void> {
  try {
    const fields: Record<string, any> = {
      Summary: entry.summary,
      Timestamp: new Date().toISOString(),
      Action: entry.action,
    };
    if (entry.actorEmail) fields["Actor Email"] = entry.actorEmail;
    if (entry.actorRole) fields["Actor Role"] = entry.actorRole;
    if (entry.targetEmail) fields["Target Email"] = entry.targetEmail;
    if (entry.targetRole) fields["Target Role"] = entry.targetRole;
    if (entry.details) fields["Details"] = entry.details;

    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${ACTIVITY_LOGS_TABLE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
  } catch (err) {
    // Never let logging failures break the primary action.
    console.error("[activity-log] write failed:", err);
  }
}
