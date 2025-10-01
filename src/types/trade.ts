import type { Database } from './supabase'

/**
 * Trade type matches the Supabase DB schema for trades table (Row type).
 * All fields and types are kept in sync with the database.
 */
export type Trade = Database['public']['Tables']['trades']['Row']