import React from 'react';
import ReactDOM from 'react-dom/client';

const TestApp = () => {
  return React.createElement('div', null,
    React.createElement('h1', null, 'Test App Working!'),
    React.createElement('p', null, 'If you see this, React is working.')
  );
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(container);
root.render(React.createElement(TestApp));