'use client'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [list, setList] = useState([])

  async function loadRecords() {
    const { data } = await supabase
      .from('sms_records')
      .select('*')
      .order('created_at', {ascending:false})
    setList(data)
  }

  useEffect(()=>{
    loadRecords()
  },[])

  return (
    <main style={{padding:30}}>
      <h1>验证码接收后台</h1>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>时间</th>
            <th>短信内容</th>
            <th>验证码</th>
          </tr>
        </thead>
        <tbody>
          {list.map(item=>(
            <tr key={item.id}>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>{item.msg_content}</td>
              <td>{item.verify_code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
