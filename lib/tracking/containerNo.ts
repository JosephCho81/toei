/** ISO 6346 컨테이너 번호 체크 디짓 검증. */
export function validateContainerNo(containerNo: string): boolean {
  const normalized = containerNo.toUpperCase().replace(/\s/g, '')
  if (!/^[A-Z]{4}\d{7}$/.test(normalized)) return false

  const values: Record<string, number> = {
    A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,
    K:21,L:23,M:24,N:25,O:26,P:27,Q:28,R:29,S:30,T:31,
    U:32,V:34,W:35,X:36,Y:37,Z:38
  }

  let sum = 0
  for (let i = 0; i < 10; i++) {
    const char = normalized[i]
    const val = /\d/.test(char) ? parseInt(char) : (values[char] ?? 0)
    sum += val * Math.pow(2, i)
  }
  const check = sum % 11 % 10
  return check === parseInt(normalized[10])
}
