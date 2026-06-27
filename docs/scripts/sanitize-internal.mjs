// Strip the SDK's INTERNAL gateway/consumer auth from public prose. External developers only
// ever authenticate with their `Authorization` API key; the gateway handshake (gatewaySecret /
// consumerUsername / X-Gateway-Secret / X-Consumer-Username / APISIX) is an implementation
// detail APISIX injects and they never see.
//
// Language-agnostic on purpose: it keys on the code identifiers (which the translations keep
// byte-for-byte), so the same pass cleans the English source AND every translation. It drops
// any whole "##" section whose body mentions those identifiers, plus stray credential lines
// elsewhere (e.g. inside the main options block), leaving the public config intact.
const INTERNAL = /gatewaySecret|consumerUsername|X-Gateway-Secret|X-Consumer-Username|APISIX/i;

export function sanitizeInternal(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (/^##\s/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
      const section = lines.slice(i, j);
      if (section.some((l) => INTERNAL.test(l))) {
        i = j; // drop the whole section (heading + body)
        continue;
      }
      out.push(...section);
      i = j;
    } else {
      if (!INTERNAL.test(lines[i])) out.push(lines[i]);
      i++;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
