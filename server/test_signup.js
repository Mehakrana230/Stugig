(async () => {
  try {
    const payload = { username: 'testuser', email: 'test@example.com', password: 'secret123', role: 'freelancer' };
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (err) {
    console.error('ERROR', err);
  }
})();
