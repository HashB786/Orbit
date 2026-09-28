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
const SignIn = lazy(() => import('./pages/SignIn'));
const Legal = lazy(() => import('./pages/Legal'));
const Join = lazy(() => import('./pages/Join'));
const Play = lazy(() => import('./pages/Play'));
const HostRoom = lazy(() => import('./pages/HostRoom'));
const Board = lazy(() => import('./pages/Board'));
const Practice = lazy(() => import('./pages/Practice'));
const NotFound = lazy(() => import('./pages/NotFound'));
// The gate is only needed on teacher pages, so it loads with them
const RequireTeacher = lazy(() => import('./components/auth/RequireTeacher'));

const page = (Component, props) => (
    <Suspense fallback={<PageSpinner />}>
        <Component {...props} />
    </Suspense>
);

// Creating and hosting need a verified teacher account; joining with a code never does
const teacherPage = (Component, reason) => (
    <Suspense fallback={<PageSpinner />}>
        <RequireTeacher reason={reason}>
            <Component />
        </RequireTeacher>
    </Suspense>
);

const fullscreenFallback = <div className="app-height flex items-center justify-center bg-[#050816]"><PageSpinner /></div>;

// Full-screen pages (students playing, host screen, smart board) have no sidebar
const fullscreen = (Component) => (
    <Suspense fallback={fullscreenFallback}>
        <Component />
    </Suspense>
);

const fullscreenTeacher = (Component) => (
    <Suspense fallback={fullscreenFallback}>
        <RequireTeacher reason="host" fullscreen>
            <Component />
        </RequireTeacher>
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
                        <Route path="create" element={teacherPage(Create, 'create')} />
                        <Route path="create/new" element={teacherPage(SetEditor, 'create')} />
                        <Route path="create/:setId" element={teacherPage(SetEditor, 'create')} />
                        <Route path="set/:setId" element={page(SetView)} />
                        <Route path="games" element={page(Games)} />
                        <Route path="host/:setId" element={teacherPage(HostSetup, 'host')} />
                        <Route path="settings" element={page(Settings)} />
                        <Route path="signin" element={page(SignIn)} />
                        <Route path="terms" element={page(Legal, { doc: 'terms' })} />
                        <Route path="privacy" element={page(Legal, { doc: 'privacy' })} />
                        <Route path="*" element={page(NotFound)} />
                    </Route>
                    <Route path="join" element={fullscreen(Join)} />
                    <Route path="play/:code" element={fullscreen(Play)} />
                    <Route path="room/:code" element={fullscreenTeacher(HostRoom)} />
                    <Route path="board/:gameId" element={fullscreenTeacher(Board)} />
                    <Route path="practice/:setId" element={fullscreen(Practice)} />
                </Routes>
                <Toaster />
            </Router>
        </MotionConfig>
    );
}

export default App;
