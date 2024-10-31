import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const ThankYou = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const checkEmailConfirmation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email_confirmed_at) {
        setIsConfirmed(true);
      }
    };

    checkEmailConfirmation();
  }, []);

  const handleGoToQuestionnaire = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.email_confirmed_at) {
      navigate('/questionnaire');
    } else {
      setShowModal(true);
    }
  };

  return (
    <div className="thank-you-container">
      <h1>Thank You for Signing Up!</h1>
      <p>We’ve sent a confirmation link to your email. Please verify your account.</p>
      <button onClick={handleGoToQuestionnaire}>Go to Questionnaire</button>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Email Confirmation Required</h3>
            <p>Please confirm your email by clicking the link we sent to your inbox.</p>
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThankYou;
