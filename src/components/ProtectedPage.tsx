import React from 'react';

const ProtectedPage = () => {
  return (
    <div>
      <h2>Protected Page</h2>
      <p>This is a protected page. You can see this only when logged in.</p>
    </div>
  );
};

export { ProtectedPage };