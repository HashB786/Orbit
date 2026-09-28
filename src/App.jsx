import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Layout from './layout/Layout';
import Home from './pages/Home';
import { PageSpinner } from './components/ui';
import { Toaster } from './components/ui/toast';
import { useTheme } from './context/ThemeContext';

// Everything except the home page is its own chunk, so phones download only what they open
const Discover = lazy(() => import('./pages/Discover'));
const Create = lazy(() => import('./pages/Create'));
const SetEditor = lazy(() => import('./pages/SetEditor'));
const SetView = lazy(() => import('./pages/SetView'));
const Games = lazy(() => import('./pages/Games'));
const HostSetup = lazy(() => import('./pages/HostSetup'));
const Settings = lazy(() => import('./pages/Settings'));
const Join = lazy(() => import('./pages/Join'));
const Play = lazy(() => import('./pages/Play'));
const HostRoom = lazy(() => import('./pages/HostRoom'));
const Board = lazy(() => import('./pages/Board'));
const Practice = lazy(() => import('./pages/Practice'));
const NotFound = lazy(() => import('./pages/NotFound'));

const page = (Component) => (
    <Suspense fallback={<PageSpinner />}>
        <Component />
    </Suspense>
);

// Full-screen pages (students playing, host screen, smart board) have no sidebar
const fullscreen = (Component) => (
    <Suspense fallback={<div className="app-height flex items-center justify-center bg-[#050816]"><PageSpinner /></div>}>
        <Component />
    </Suspense>
);

function App() {
    const { performance } = useTheme();
    return (
        <MotionConfig reducedMotion={performance.reducedMotion ? 'always' : 'user'}>
            <Router>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="discover" element={page(Discover)} />
                        <Route path="create" element={page(Create)} />
                        <Route path="create/new" element={page(SetEditor)} />
                        <Route path="create/:setId" element={page(SetEditor)} />
                        <Route path="set/:setId" element={page(SetView)} />
                        <Route path="games" element={page(Games)} />
                        <Route path="host/:setId" element={page(HostSetup)} />
                        <Route path="settings" element={page(Settings)} />
                        <Route path="*" element={page(NotFound)} />
                    </Route>
                    <Route path="join" element={fullscreen(Join)} />
                    <Route path="play/:code" element={fullscreen(Play)} />
                    <Route path="room/:code" element={fullscreen(HostRoom)} />
                    <Route path="board/:gameId" element={fullscreen(Board)} />
                    <Route path="practice/:setId" element={fullscreen(Practice)} />
                </Routes>
                <Toaster />
            </Router>
        </MotionConfig>
    );
}

export default App;
