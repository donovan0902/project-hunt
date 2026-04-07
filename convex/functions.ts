import { Triggers } from "convex-helpers/server/triggers";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { internalMutation as rawMutation } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|div|blockquote|pre|ol|ul)>/gi, " ")
    .replace(/<(p|h[1-6]|li|div|blockquote|pre|ol|ul|br)[^>]*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const triggers = new Triggers<DataModel>();

triggers.register("projects", async (ctx, change) => {
  if (change.newDoc) {
    // Get team name if teamId exists
    let teamName = "";
    if (change.newDoc.teamId) {
      const team = await ctx.db.get(change.newDoc.teamId);
      teamName = team?.name ?? "";
    }

    const summaryText = change.newDoc.summary ? stripHtml(change.newDoc.summary) : "";
    const allFields = `${change.newDoc.name} ${summaryText} ${teamName}`.trim();

    if (change.newDoc.allFields !== allFields) {
      await ctx.db.patch(change.id, { allFields });
    }
  }
});

export const internalMutation = customMutation(rawMutation, customCtx(triggers.wrapDB));