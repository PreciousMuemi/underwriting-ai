import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">AutoUnderwriter</div>
        <div>
          {/* Add navigation links here */}
          <a href="/" className="mr-4 text-gray-700 hover:text-gray-900">Home</a>
          <a href="/profile" className="mr-4 text-gray-700 hover:text-gray-900">Profile</a>
          <a href="/quotes" className="text-gray-700 hover:text-gray-900">Quotes</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
