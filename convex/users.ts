import { internalMutation, query, QueryCtx, mutation } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const store = mutation({
  args: { workosUserId: v.string(), name: v.string(), avatarUrlId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    // Note: If you don't want to define an index right away, you can use
    // ctx.db.query("users")
    //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    //  .unique();
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      // If we've seen this identity before but the name or avatar url has changed, patch the value.
      if (user.name !== args.name || user.avatarUrlId !== args.avatarUrlId) {
        await ctx.db.patch(user._id, { name: args.name, avatarUrlId: args.avatarUrlId });
      }
      return user._id;
    }
    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: args.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
      avatarUrlId: args.avatarUrlId,
      workosUserId: args.workosUserId,
    });
  },
});

// export const upsertFromClerk = internalMutation({
//   args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
//   async handler(ctx, { data }) {
//     const userAttributes = {
//       name: `${data.first_name} ${data.last_name}`,
//       externalId: data.id,
//       avatarUrlId: data.image_url,
//       email: data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address,
//     };

//     const user = await userByExternalId(ctx, data.id);
//     if (user === null) {
//       await ctx.db.insert("users", userAttributes);
//     } else {
//       await ctx.db.patch(user._id, userAttributes);
//     }
//   },
// });

// export const deleteFromClerk = internalMutation({
//   args: { clerkUserId: v.string() },
//   async handler(ctx, { clerkUserId }) {
//     const user = await userByExternalId(ctx, clerkUserId);

//     if (user !== null) {
//       await ctx.db.delete(user._id);
//     } else {
//       console.warn(
//         `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
//       );
//     }
//   },
// });

// use this to get the current user document for linking _id to other documents and such. If the user is not found, throw an error.
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// export async function getCurrentUser(ctx: QueryCtx) {
//   const identity = await ctx.auth.getUserIdentity();
//   if (identity === null) {
//     return null;
//   }
//   return await userByTokenIdentifier(ctx, identity.tokenIdentifier);
// }

// other users will be fetched by their document id according to convex conventions
// export async function userByTokenIdentifier(ctx: QueryCtx, tokenIdentifier: string) {
//   return await ctx.db
//     .query("users")
//     .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
//     .unique();
// }