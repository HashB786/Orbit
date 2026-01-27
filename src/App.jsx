import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';
import Home from './pages/Home';
import Timetable from './pages/Timetable';
import Todo from './pages/Todo';
import Games from './pages/Games';
import Settings from './pages/Settings';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="timetable" element={<Timetable />} />
                    <Route path="todo" element={<Todo />} />
                    <Route path="games" element={<Games />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
