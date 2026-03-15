import './index.css';
import {createRoot} from 'react-dom/client';
import {App} from './App';

// NOTE: StrictMode removed intentionally.
// React 19 StrictMode double-renders (mount/unmount/remount) which causes
// @react-three/rapier to call removeRigidBody + createRigidBody concurrently
// on the same WASM world, triggering Rust's "recursive use of an object" panic.
createRoot(document.getElementById('root')!).render(<App />);
