                        import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';
import Welcome from '../Components/Admin/Welcome.jsx';
import LoginSignUp from '../Components/Admin/LoginSignUp/LoginSignUp.jsx';

function LogoOverlay() {
  const style = {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 9999,
    opacity: 0.95,
  };
  const imgStyle = {
    height: 36,
    width: 'auto',
  };
  return (
    <div style={style} aria-hidden="true">
      <img
        src={process.env.PUBLIC_URL + '/Images/Logo Without Caption.png'}
        alt="Logo"
        style={imgStyle}
      />
    </div>
  );
}

function AdminRedirect() {
  useEffect(() => {
    window.location.href = 'http://localhost:5173/';
  }, []);
  return null;
}

export default function App() {
  return (
    <>
      <LogoOverlay />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginSignUp />}></Route>
          <Route path="/admin" element={<AdminRedirect />}></Route>
          <Route path="/welcome" element={<Welcome />}></Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}