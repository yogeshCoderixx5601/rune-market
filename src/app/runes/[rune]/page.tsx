import SingleRunePage from '@/views/SingleRune'
import React from 'react'

const page = ({ params }: { params: { rune: string } }) => {
    console.log(params,"UNIQUE RUNE PARAM")
    const rune_name = decodeURI(params.rune)
  return (
    <div><SingleRunePage rune_name={rune_name}/></div>
  )
}

export default page