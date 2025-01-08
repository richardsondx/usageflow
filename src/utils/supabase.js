import { createClient } from '@supabase/supabase-js'

class SupabaseClient {
  constructor(supabaseUrl, supabaseKey) {
    this.client = createClient(supabaseUrl, supabaseKey)
  }

  async insert(table, data) {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
    
    if (error) throw error
    return result
  }

  async fetch(table, query = {}) {
    const { column, value, limit = 1 } = query
    let request = this.client.from(table).select('*')
    
    if (column && value) {
      request = request.eq(column, value)
    }
    
    const { data, error } = await request.limit(limit)
    
    if (error) throw error
    return data
  }

  async update(table, query, updates) {
    const { column, value } = query
    const { data, error } = await this.client
      .from(table)
      .update(updates)
      .eq(column, value)
    
    if (error) throw error
    return data
  }
}

export default SupabaseClient