import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(req) {
  const body = await req.json()
  const { msg_content, verify_code } = body

  const { data, error } = await supabase
    .from('sms_records')
    .insert([
      { msg_content, verify_code }
    ])

  if(error){
    return Response.json({success:false, error: error.message}, {status:400})
  }
  return Response.json({success:true, data})
}
