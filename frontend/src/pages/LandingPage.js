import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';
import { toast } from 'sonner';
import { ArrowRight, Footprints, Users, Heart, Trophy, Mountain, MapPin, GraduationCap, Building2, Send, CheckCircle } from 'lucide-react';

const HERO_BG = 'https://images.unsplash.com/photo-1738507967372-67c692309a07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwxfHxrZW55YSUyMGxhbmRzY2FwZSUyMHJvYWQlMjByZWQlMjBlYXJ0aCUyMG1vdW50JTIwa2VueWF8ZW58MHx8fHwxNzcwNzQ3MzM3fDA&ixlib=rb-4.1.0&q=85';
const STUDENTS_IMG = 'https://images.unsplash.com/photo-1729691032175-d6edd1581a31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwc3R1ZGVudHMlMjBzbWlsaW5nJTIwc2Nob29sJTIwdW5pZm9ybSUyMGtlbnlhfGVufDB8fHx8MTc3MDc0NzM1MHww&ixlib=rb-4.1.0&q=85';
const WALKERS_IMG = 'https://images.unsplash.com/photo-1632089401802-57a6747b3dd1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwZ3JvdXAlMjBwZW9wbGUlMjB3YWxraW5nJTIwaGlraW5nJTIwbmF0dXJlJTIwaGFwcHl8ZW58MHx8fHwxNzcwNzQ3MzUxfDA&ixlib=rb-4.1.0&q=85';

export default function LandingPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [sponsorLevels, setSponsorLevels] = useState([]);
  
  // Become a Sponsor form
  const [inquiryForm, setInquiryForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    interested_level: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/challenges').then(r => setChallenges(r.data)).catch(() => {});
    api.get('/corporate-sponsors/public').then(r => setSponsors(r.data)).catch(() => {});
    api.get('/sponsorship-levels').then(r => setSponsorLevels(r.data)).catch(() => {});
  }, []);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.company_name || !inquiryForm.contact_name || !inquiryForm.email) {
      toast.error('Please fill in required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/sponsor-inquiries', inquiryForm);
      setSubmitted(true);
      toast.success('Thank you! We will contact you soon.');
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
            {/* H2: Choose Your Route CTA */}
            <div className="text-center mt-10">
              <Link to={user ? '/onboarding' : '/signup'}>
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 font-medium px-8 py-5 h-auto text-base transition-all hover:scale-[1.02]" data-testid="choose-route-cta">
                  Choose Your Route <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
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

      {/* Sponsors Section */}
      {sponsors.length > 0 && (
        <section className="py-16 md:py-20 bg-stone-50" data-testid="sponsors-section">
          <div className="container-app">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-orange-600" />
                <span className="text-orange-600 font-medium text-sm tracking-wider uppercase">Our Partners</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
                Thank You to Our Sponsors
              </h2>
              <p className="text-stone-500 mt-2 max-w-xl mx-auto">
                The Kenya Challenge is made possible by these generous organizations.
              </p>
            </div>

            <div className="space-y-12">
              {sponsors.map(({ level, sponsors: levelSponsors }) => (
                <div key={level.id} className="text-center" data-testid={`sponsor-level-${level.id}`}>
                  <h3 className="text-lg font-bold text-stone-800 mb-6 inline-block border-b-2 border-orange-300 pb-1">
                    {level.name}
                  </h3>
                  <div className="flex flex-wrap justify-center items-center gap-8">
                    {levelSponsors.map(sponsor => (
                      <a
                        key={sponsor.id}
                        href={sponsor.website_url || '#'}
                        target={sponsor.website_url ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="group"
                        data-testid={`sponsor-${sponsor.id}`}
                      >
                        {sponsor.logo_url ? (
                          <div className="w-32 h-20 md:w-40 md:h-24 bg-white rounded-xl shadow-sm border border-stone-100 p-3 flex items-center justify-center transition-all group-hover:shadow-md group-hover:scale-105">
                            <img
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-20 md:w-40 md:h-24 bg-white rounded-xl shadow-sm border border-stone-100 p-3 flex items-center justify-center transition-all group-hover:shadow-md group-hover:scale-105">
                            <span className="text-sm font-medium text-stone-700 text-center">{sponsor.name}</span>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Become a Sponsor Form */}
      <section className="py-16 md:py-20 bg-[#1a3660]" data-testid="become-sponsor-section">
        <div className="container-app">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <Building2 className="w-10 h-10 text-orange-400 mx-auto mb-3" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Become a Sponsor
              </h2>
              <p className="text-stone-300">
                Partner with The Kenya Challenge and make a lasting impact on education in Kenya.
                Your sponsorship helps students achieve their dreams.
              </p>
            </div>

            {submitted ? (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-2xl">
                <CardContent className="p-10 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                  <p className="text-stone-300">
                    We've received your inquiry and will be in touch soon to discuss sponsorship opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-2xl">
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleInquirySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white text-sm">Company Name *</Label>
                        <Input
                          value={inquiryForm.company_name}
                          onChange={(e) => setInquiryForm(f => ({...f, company_name: e.target.value}))}
                          placeholder="Your organization"
                          required
                          className="mt-1 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-stone-400 h-12"
                          data-testid="sponsor-inquiry-company"
                        />
                      </div>
                      <div>
                        <Label className="text-white text-sm">Contact Person *</Label>
                        <Input
                          value={inquiryForm.contact_name}
                          onChange={(e) => setInquiryForm(f => ({...f, contact_name: e.target.value}))}
                          placeholder="Your name"
                          required
                          className="mt-1 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-stone-400 h-12"
                          data-testid="sponsor-inquiry-contact"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white text-sm">Email *</Label>
                        <Input
                          type="email"
                          value={inquiryForm.email}
                          onChange={(e) => setInquiryForm(f => ({...f, email: e.target.value}))}
                          placeholder="email@company.com"
                          required
                          className="mt-1 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-stone-400 h-12"
                          data-testid="sponsor-inquiry-email"
                        />
                      </div>
                      <div>
                        <Label className="text-white text-sm">Phone</Label>
                        <Input
                          value={inquiryForm.phone}
                          onChange={(e) => setInquiryForm(f => ({...f, phone: e.target.value}))}
                          placeholder="+1 (555) 123-4567"
                          className="mt-1 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-stone-400 h-12"
                          data-testid="sponsor-inquiry-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-white text-sm">Interested Sponsorship Level</Label>
                      <Select value={inquiryForm.interested_level} onValueChange={(v) => setInquiryForm(f => ({...f, interested_level: v}))}>
                        <SelectTrigger className="mt-1 rounded-xl bg-white/10 border-white/20 text-white h-12" data-testid="sponsor-inquiry-level">
                          <SelectValue placeholder="Select a level (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="undecided">Not sure yet</SelectItem>
                          {sponsorLevels.map(level => (
                            <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white text-sm">Message</Label>
                      <Textarea
                        value={inquiryForm.message}
                        onChange={(e) => setInquiryForm(f => ({...f, message: e.target.value}))}
                        placeholder="Tell us about your interest in sponsoring The Kenya Challenge..."
                        rows={4}
                        className="mt-1 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-stone-400"
                        data-testid="sponsor-inquiry-message"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-6 h-auto text-base"
                      data-testid="sponsor-inquiry-submit"
                    >
                      {submitting ? 'Submitting...' : (
                        <>
                          <Send className="w-4 h-4 mr-2" /> Become a Sponsor
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
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
