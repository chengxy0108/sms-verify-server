import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 注意：每次请求时创建 client，避免 Vercel serverless 环境复用连接问题
function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * 从短信原文里提取验证码：4~6 位数字，优先匹配含 "验证码" 或 "code" 上下文
 */
function extractCode(raw = '') {
  if (!raw) return ''
  const text = String(raw)
  // 1) 优先匹配 "验证码" 后跟数字
  let m = text.match(/(?:验证码|verification code|code|码)\s*[:：]?\s*(\d{4,8})/i)
  if (m) return m[1]
  // 2) 匹配 4~6 位纯数字（独立 token）
  m = text.match(/(?:^|\D)(\d{4,6})(?:\D|$)/)
  if (m) return m[1]
  // 3) 兜底：任意 4~6 位数字
  m = text.match(/\d{4,6}/)
  return m ? m[1] : ''
}

export async function POST(req) {
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json(
      { success: false, error: 'Supabase 未配置（缺 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY）' },
      { status: 500 }
    )
  }

  let body
  try {
    body = await req.json()
  } catch (e) {
    return Response.json({ success: false, error: 'body 不是合法 JSON' }, { status: 400 })
  }

  // 兼容多种字段命名
  const phone = body.phone || body.mobile || ''
  const raw = body.raw || body.msg_content || body.content || body.sms || ''
  const providedCode = body.verify_code || body.code || ''
  const device = body.device || ''
  const ts = body.ts || Date.now()

  // 后端提取验证码：用户提供 code 优先，否则本地正则
  const code = (providedCode && String(providedCode).trim()) || extractCode(raw)

  // 入参校验
  if (!raw && !code) {
    return Response.json({ success: false, error: 'raw 和 code 至少传一个' }, { status: 400 })
  }

  const row = {
    phone: phone || null,
    verify_code: code || null,
    msg_content: raw || null,
    device: device || null,
    source_ts: ts || null,
  }

  const { data, error } = await supabase.from('sms_records').insert([row])

  if (error) {
    return Response.json({ success: false, error: error.message, row }, { status: 400 })
  }
  return Response.json({ success: true, data, code })
}
