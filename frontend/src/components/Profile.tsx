import React, { useState, useEffect } from 'react';

interface UserProfile {
  username: string;
  email: string;
  joinedDate: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Fetch user profile from API or local storage
    // For now, using dummy data
    setProfile({
      username: 'johndoe',
      email: 'johndoe@example.com',
      joinedDate: '2022-01-15',
    });
  }, []);

  if (!profile) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Profile</h2>
      <p><strong>Username:</strong> {profile.username}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Joined Date:</strong> {profile.joinedDate}</p>
    </div>
  );
};

export default Profile;
