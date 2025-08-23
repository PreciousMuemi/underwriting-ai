import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">AutoUnderwriter</div>
        <div>
          {/* Add navigation links here */}
          <Link to="/app" className="mr-4 text-gray-700 hover:text-gray-900">Home</Link>
          <Link to="/app/profile" className="mr-4 text-gray-700 hover:text-gray-900">Profile</Link>
          <Link to="/app/quotes" className="text-gray-700 hover:text-gray-900">Quotes</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
