import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState, btn } from '../components/ui';

const NotFound = () => (
    <div className="py-10">
        <EmptyState icon={Compass} title="This page drifted out of orbit" action={<Link to="/" className={btn.primary}>Go home</Link>}>
            The link may be old or mistyped.
        </EmptyState>
    </div>
);

export default NotFound;
