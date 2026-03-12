import { protectedProcedure, router } from './trpc'
import { exportService } from '../services/export.service'
import { TRPCError } from '@trpc/server'

export const exportsRouter = router({
  /**
   * Generate all exports for the Astro frontend
   */
  generateAll: protectedProcedure.mutation(async () => {
    try {
      const result = await exportService.generateAllExports()

      return {
        success: true,
        message: 'All exports generated successfully',
        exports: result,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate exports',
        cause: error,
      })
    }
  }),

  /**
   * Generate products export only
   */
  generateProducts: protectedProcedure.mutation(async () => {
    try {
      const result = await exportService.generateProductsExport()

      return {
        success: true,
        message: `${result.count} products exported`,
        ...result,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate products export',
        cause: error,
      })
    }
  }),

  /**
   * Generate manufacturers export only
   */
  generateManufacturers: protectedProcedure.mutation(async () => {
    try {
      const result = await exportService.generateManufacturersExport()

      return {
        success: true,
        message: `${result.count} manufacturers exported`,
        ...result,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate manufacturers export',
        cause: error,
      })
    }
  }),

  /**
   * Generate categories export only
   */
  generateCategories: protectedProcedure.mutation(async () => {
    try {
      const result = await exportService.generateCategoriesExport()

      return {
        success: true,
        message: `${result.count} categories exported`,
        ...result,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate categories export',
        cause: error,
      })
    }
  }),

  /**
   * Generate hubs export only
   */
  generateHubs: protectedProcedure.mutation(async () => {
    try {
      const result = await exportService.generateHubsExport()

      return {
        success: true,
        message: `${result.count} hubs exported`,
        ...result,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate hubs export',
        cause: error,
      })
    }
  }),

  /**
   * Generate protocols export only
   */
  generateProtocols: protectedProcedure.mutation(async () => {
    try {
      const result = await exportService.generateProtocolsExport()

      return {
        success: true,
        message: `${result.count} protocols exported`,
        ...result,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate protocols export',
        cause: error,
      })
    }
  }),

  /**
   * List all exported files
   */
  list: protectedProcedure.query(async () => {
    try {
      const files = await exportService.listExports()

      return {
        files,
        count: files.length,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list exports',
        cause: error,
      })
    }
  }),
})
