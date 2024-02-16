import{ Routes, Route } from 'react-router-dom';
import './App.css'

import SignInForm from './_auth/forms/SignInForm';
import SignUpForm from './_auth/forms/SignUpForm';
import AuthLayout from './_auth/AuthLayout';
import RootLayout from './_root/RootLayout';
import { EditPost, Explore, Home, PostDetails, Profile, Saved, UpdateProfile } from './_root/pages';
import { Toaster } from './components/ui/toaster';
import AllUsers from './_root/pages/AllUsers';
import CreatePost from './_root/pages/CreatePost';

function App() {


  return (
    <main className="flex h-screen">
      <Routes>
        {/* pulic routes*/}
        <Route element={<AuthLayout/>}>
          <Route path="/sign-in" element={<SignInForm/>}></Route>
          <Route path="/sign-up" element={<SignUpForm/>}></Route>
        </Route>
        {/* private routes*/}
        <Route element={<RootLayout/>}>
          <Route index element={<Home/>}></Route>
          <Route path="/explore" element={<Explore/>}></Route>
          <Route path="/saved" element={<Saved/>}></Route>
          <Route path="/all-users" element={<AllUsers/>}></Route>
          <Route path="/create-post" element={<CreatePost/>}></Route>
          <Route path="/update-post/:id" element={<EditPost/>}></Route>
          <Route path="/post/:id" element={<PostDetails/>}></Route>
          <Route path="/profile/:id/*" element={<Profile/>}></Route>
          <Route path="/update-profile/:id" element={<UpdateProfile/>}></Route>
        </Route>
      </Routes>
      <Toaster/>
    </main>
  )
}

export default App
