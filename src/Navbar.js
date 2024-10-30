import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import logo from './icons/logo.png';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav style={styles.navbar}>
       <h1 style={styles.logo}>
        <img src={logo} alt="Logo" style={{ width: '180px', height: '40px' }} />
      </h1>

      {/* Dropdown Menu */}
      <div style={styles.dropdown}>
        <div onClick={toggleDropdown} style={styles.dropdownTrigger}>
          &#9660; {/* Downward arrow icon */}
        </div>

        {/* Dropdown Content */}
        {dropdownOpen && (
          <div style={styles.dropdownContent}>
            <p onClick={handleLogout} style={styles.dropdownItem}>Logout</p>
            <p onClick={() => navigate('/preferences')} style={styles.dropdownItem}>Preferences</p>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between', // Space out logo and dropdown to opposite ends
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#dff5c1',
    color: '#123522',
  },
  logo: {
    fontSize: '24px',
  },
  dropdown: {
    position: 'relative',
    display: 'inline-block',
  },
  dropdownTrigger: {
    cursor: 'pointer',
    fontSize: '18px',
  },
  dropdownContent: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: 'white',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '5px',
    overflow: 'hidden',
    zIndex: 1,
  },
  dropdownItem: {
    padding: '10px 20px',
    cursor: 'pointer',
    color: '#333',
  },
};

export default Navbar;
