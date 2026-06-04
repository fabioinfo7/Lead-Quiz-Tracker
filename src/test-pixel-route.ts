async function checkRoute() {
  const res = await fetch('http://localhost:3000/pixel.js?cid=camp_etvwkb6');
  console.log('Status:', res.status);
  console.log('Content-Type:', res.headers.get('content-type'));
  const body = await res.text();
  console.log('Body length:', body.length);
  console.log('First 200 chars:', body.substring(0, 200));
  console.log('Last 200 chars:', body.substring(body.length - 200));
}
checkRoute();
