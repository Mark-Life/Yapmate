/**
 * User Rules router - user-defined custom instructions/rules management
 */

import { ORPCError } from "@orpc/server";
import {
  userRuleInsertSchema,
  userRuleSelectSchema,
  userRuleUpdateSchema,
} from "@yapmate/db/schema";
import {
  createUserRule,
  deleteUserRule,
  getUserRules,
  reorderUserRules,
  updateUserRule,
} from "@yapmate/db/service";
import { z } from "zod";
import { protectedProcedure } from "../middleware";

/**
 * User Rules router - handles CRUD operations for user rules
 */
export const userRules = {
  /**
   * List all user rules
   */
  list: protectedProcedure
    .output(z.array(userRuleSelectSchema))
    .handler(async ({ context }) => {
      if (!context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "User ID not available",
        });
      }
      return await getUserRules(context.userId);
    }),

  /**
   * Create a new user rule
   */
  create: protectedProcedure
    .input(userRuleInsertSchema)
    .output(userRuleSelectSchema)
    .handler(async ({ input, context }) => {
      if (!context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "User ID not available",
        });
      }
      return await createUserRule(context.userId, input);
    }),

  /**
   * Update a user rule
   */
  update: protectedProcedure
    .input(
      userRuleUpdateSchema.extend({
        id: z.uuid(),
      })
    )
    .output(userRuleSelectSchema)
    .handler(async ({ input, context }) => {
      if (!context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "User ID not available",
        });
      }
      const { id, ...updateData } = input;
      return await updateUserRule(id, context.userId, updateData);
    }),

  /**
   * Delete a user rule
   */
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input, context }) => {
      if (!context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "User ID not available",
        });
      }
      await deleteUserRule(input.id, context.userId);
      return { success: true };
    }),

  /**
   * Reorder user rules
   * Accepts array of rule IDs in desired order
   */
  reorder: protectedProcedure
    .input(z.object({ orderedIds: z.array(z.uuid()) }))
    .output(z.array(userRuleSelectSchema))
    .handler(async ({ input, context }) => {
      if (!context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "User ID not available",
        });
      }
      return await reorderUserRules(context.userId, input.orderedIds);
    }),
};
