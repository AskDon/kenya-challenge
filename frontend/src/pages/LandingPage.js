import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import api from '../lib/api';
import { ArrowRight, Footprints, Users, Heart, Trophy, Mountain, MapPin, GraduationCap } from 'lucide-react';

const HERO_BG = 'https://images.unsplash.com/photo-1738507967372-67c692309a07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwxfHxrZW55YSUyMGxhbmRzY2FwZSUyMHJvYWQlMjByZWQlMjBlYXJ0aCUyMG1vdW50JTIwa2VueWF8ZW58MHx8fHwxNzcwNzQ3MzM3fDA&ixlib=rb-4.1.0&q=85';
const STUDENTS_IMG = 'https://images.unsplash.com/photo-1729691032175-d6edd1581a31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwc3R1ZGVudHMlMjBzbWlsaW5nJTIwc2Nob29sJTIwdW5pZm9ybSUyMGtlbnlhfGVufDB8fHx8MTc3MDc0NzM1MHww&ixlib=rb-4.1.0&q=85';
const WALKERS_IMG = 'https://images.unsplash.com/photo-1632089401802-57a6747b3dd1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwZ3JvdXAlMjBwZW9wbGUlMjB3YWxraW5nJTIwaGlraW5nJTIwbmF0dXJlJTIwaGFwcHl8ZW58MHx8fHwxNzcwNzQ3MzUxfDA&ixlib=rb-4.1.0&q=85';

export default function LandingPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    api.get('/challenges').then(r => setChallenges(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="Kenya landscape" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-stone-900/70" />
        </div>
        <div className="relative container-app py-20">
          <div className="max-w-2xl opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <p className="text-orange-400 font-medium tracking-widest uppercase text-xs mb-4">
              Kenya Education Fund
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Walk for Education.<br />Walk for Kenya.
            </h1>
            <p className="text-stone-300 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Join The Kenya Challenge and walk virtual routes across Kenya while
              raising funds for students who need your help. Every step counts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={user ? '/dashboard' : '/signup'}>
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 font-medium px-8 py-6 h-auto text-base transition-all hover:scale-[1.02]" data-testid="hero-cta-btn">
                  {user ? 'Go to Dashboard' : 'Start Your Journey'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="outline" className="rounded-full border-2 border-white/30 hover:border-white text-white bg-transparent px-6 py-6 h-auto text-base" data-testid="hero-leaderboard-btn">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-16 md:py-20 bg-white border-b border-stone-100" data-testid="impact-section">
        <div className="container-app">
          <p className="text-orange-600 font-medium tracking-widest uppercase text-xs text-center mb-3">25 Years of Impact</p>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 text-center mb-12">
            Kenya Education Fund
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { num: '4,800+', label: 'Scholarships Provided', icon: GraduationCap },
              { num: '650', label: 'Active Scholarships', icon: Heart },
              { num: '153', label: 'Partner Schools', icon: MapPin },
              { num: '99%', label: 'Transition Rate', icon: Trophy },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-stone-900">{stat.num}</p>
                <p className="text-sm text-stone-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24" data-testid="how-it-works-section">
        <div className="container-app">
          <p className="text-orange-600 font-medium tracking-widest uppercase text-xs text-center mb-3">How It Works</p>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 text-center mb-12">
            Four Steps to Make a Difference
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Sign Up', desc: 'Create your account and choose a pricing level that fits.', icon: Users },
              { step: '02', title: 'Pick a Route', desc: 'Select a virtual Kenyan challenge route to walk.', icon: Mountain },
              { step: '03', title: 'Walk & Log', desc: 'Log your daily steps or kilometers and watch your progress.', icon: Footprints },
              { step: '04', title: 'Fundraise', desc: 'Share your page, collect sponsorships, and change lives.', icon: Heart },
            ].map((item) => (
              <Card key={item.step} className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300">
                <CardContent className="p-6 md:p-8">
                  <span className="text-4xl font-bold text-orange-100">{item.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mt-3 mb-3">
                    <item.icon className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Challenges Preview */}
      {challenges.length > 0 && (
        <section className="py-16 md:py-24 bg-white" data-testid="challenges-preview">
          <div className="container-app">
            <p className="text-orange-600 font-medium tracking-widest uppercase text-xs text-center mb-3">Virtual Routes</p>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 text-center mb-12">
              Choose Your Challenge
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {challenges.map((ch) => (
                <Card key={ch.id} className="bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300">
                  <div className="h-3 bg-gradient-to-r from-orange-500 to-emerald-600" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Mountain className="w-5 h-5 text-orange-600" />
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{ch.total_distance_km} km</span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 mb-2">{ch.name}</h3>
                    <p className="text-sm text-stone-500 leading-relaxed mb-4 line-clamp-3">{ch.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ch.milestones?.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{m.title}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why KEF */}
      <section className="py-16 md:py-24" data-testid="why-kef-section">
        <div className="container-app">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-orange-600 font-medium tracking-widest uppercase text-xs mb-3">Why KEF</p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-6">
                100% of Every Donation Goes to Student Education
              </h2>
              <p className="text-stone-600 leading-relaxed mb-6">
                In Kenya, high school is not free. Over 3.5 million children are not in school due to poverty.
                KEF provides access to quality education, supporting students from high school through university
                with a 99% transition rate.
              </p>
              <p className="text-stone-600 leading-relaxed mb-8">
                Your participation in The Kenya Challenge directly funds scholarships, uniforms, school supplies,
                and mentorship for students who would otherwise not have access to education.
              </p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">$105</p>
                  <p className="text-xs text-stone-500">supports 1 child</p>
                </div>
                <div className="w-px h-10 bg-stone-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">$210</p>
                  <p className="text-xs text-stone-500">supports 2 children</p>
                </div>
                <div className="w-px h-10 bg-stone-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">$315</p>
                  <p className="text-xs text-stone-500">supports 3 children</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={STUDENTS_IMG}
                alt="Kenyan students"
                className="rounded-2xl object-cover w-full h-[400px] shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-stone-900" data-testid="cta-section">
        <div className="container-app text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Walk for Kenya?
          </h2>
          <p className="text-stone-400 max-w-lg mx-auto mb-8">
            Join walkers from around the world. Every kilometer you walk brings a Kenyan student closer to their dreams.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={user ? '/dashboard' : '/signup'}>
              <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg font-medium px-8 py-6 h-auto text-base" data-testid="cta-join-btn">
                {user ? 'Continue Your Journey' : 'Join The Challenge'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <img
            src={WALKERS_IMG}
            alt="Community walking"
            className="mt-12 rounded-2xl object-cover w-full max-w-3xl mx-auto h-[250px] md:h-[350px] opacity-80"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-stone-900 border-t border-stone-800">
        <div className="container-app text-center">
          <p className="text-stone-500 text-sm">
            The Kenya Challenge is a fundraising initiative of the{' '}
            <a href="https://www.kenyaeducationfund.org/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
              Kenya Education Fund
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
