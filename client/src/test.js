function main() {
  const d = new Date()
  const beginTime = d.getMinutes()
  console.log(beginTime)
  const endTime = d.getMinutes()
  console.log(endTime)
  const result = endTime - beginTime
  console.log(result)
}
main()
