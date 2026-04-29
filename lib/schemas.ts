import { z } from 'zod'

export const listingStatusSchema = z.enum(['for-sale', 'pending', 'sold'])

export const propertyTypeSchema = z.enum([
  'single-family',
  'condo',
  'townhouse',
  'multi-family',
  'land',
])

export const listingFilterSchema = z.object({
  city: z.string().min(1).optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  minBeds: z.number().int().nonnegative().optional(),
  minBaths: z.number().nonnegative().optional(),
  propertyType: propertyTypeSchema.optional(),
  status: listingStatusSchema.optional(),
})

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(50),
  offset: z.number().int().nonnegative(),
})

export const listingSummarySchema = z.object({
  id: z.string().min(1),
  mlsNumber: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  price: z.number().int().nonnegative(),
  beds: z.number().int().nonnegative(),
  baths: z.number().nonnegative(),
  sqft: z.number().int().nonnegative(),
  status: listingStatusSchema,
  primaryImage: z.string().min(1),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
})

export const listingDetailSchema = listingSummarySchema.extend({
  description: z.string().min(1),
  images: z.array(z.string().min(1)).min(1),
  yearBuilt: z.number().int().min(1800).max(2100),
  propertyType: propertyTypeSchema,
  features: z.array(z.string().min(1)),
  schoolDistrict: z.string().min(1).optional(),
  listingAgent: z.string().min(1).optional(),
})

export const listingListResponseSchema = z.object({
  items: z.array(listingSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(50),
  offset: z.number().int().nonnegative(),
})

const positiveInt = z
  .string()
  .regex(/^\d+$/, 'must be a non-negative integer')
  .transform((v) => Number.parseInt(v, 10))

const positiveNumber = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'must be a non-negative number')
  .transform((v) => Number.parseFloat(v))

export const listQuerySchema = z.object({
  city: z.string().min(1).optional(),
  min_price: positiveInt.optional(),
  max_price: positiveInt.optional(),
  min_beds: positiveInt.optional(),
  min_baths: positiveNumber.optional(),
  property_type: propertyTypeSchema.optional(),
  status: listingStatusSchema.optional(),
  limit: positiveInt
    .pipe(z.number().int().min(1).max(50))
    .optional(),
  offset: positiveInt.optional(),
})

export type ListQuery = z.infer<typeof listQuerySchema>
