import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
} from 'lucide-react';
import styles from './About.module.css';

const trustPoints = [
  { icon: BadgeCheck, label: 'Verified venues', text: 'Grounds and courts presented with the details players need before they book.' },
  { icon: Clock3, label: 'Fast slot selection', text: 'A simpler flow for finding available courts and confirming game time.' },
  { icon: ShieldCheck, label: 'Clear booking records', text: 'Players can review booking details from their account dashboard.' },
  { icon: Building2, label: 'Owner tools', text: 'Turf owners can manage courts, slots, offline bookings, and venue details.' },
];

const steps = [
  { icon: Search, title: 'Find a turf', text: 'Search by venue name or location and compare available courts.' },
  { icon: CalendarCheck, title: 'Pick your slot', text: 'Choose the court, date, time, and booking option that fits your game.' },
  { icon: Smartphone, title: 'Confirm booking', text: 'Keep the booking details ready when you arrive at the venue.' },
];

const faqs = [
  {
    question: 'How do I book a turf?',
    answer: 'Open the Turfs page, choose a venue, pick a court and available slot, then confirm the booking from the details page.',
  },
  {
    question: 'Can I see my bookings after confirmation?',
    answer: 'Yes. Logged-in players can use the dashboard to review upcoming and past bookings.',
  },
  {
    question: 'Are the turf details verified?',
    answer: 'BookMyTurf is designed around owner-managed venue details, courts, pricing, and availability so players can make a confident choice.',
  },
  {
    question: 'Can I book half court or shared court slots?',
    answer: 'Where a venue supports it, the booking flow can show court options such as half-court or shared-court availability.',
  },
  {
    question: 'Who sets the price for each court?',
    answer: 'Turf owners manage their own venue, court, and slot details. Players can review the available options before confirming.',
  },
  {
    question: 'How can turf owners manage bookings?',
    answer: 'Owners can use the owner panel to add turfs, manage courts and slots, and track bookings from one place.',
  },
  {
    question: 'What should I do if there is an issue at the venue?',
    answer: 'Keep your booking details handy and contact the venue or platform support with the booking information so the issue can be checked quickly.',
  },
];

const About: React.FC = () => {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>About BookMyTurf</p>
          <h1>Book better games, faster.</h1>
          <p className={styles.heroText}>
            BookMyTurf helps players find sports venues, compare courts, choose slots, and keep bookings organized in one clean flow.
          </p>
          <div className={styles.heroActions}>
            <Link to="/turfs" className={styles.primaryCta}>
              Explore turfs <ArrowRight size={18} />
            </Link>
            <Link to="/register" className={styles.secondaryCta}>
              Create account
            </Link>
          </div>
        </div>

        <div className={styles.heroPanel} aria-label="BookMyTurf highlights">
          <div className={styles.pitchHeader}>
            <span><MapPin size={17} /> Nearby venues</span>
            <strong>Today</strong>
          </div>
          <div className={styles.pitch}>
            <div className={styles.pitchLine}></div>
            <div className={styles.centerCircle}></div>
            <div className={styles.goalTop}></div>
            <div className={styles.goalBottom}></div>
          </div>
          <div className={styles.heroStats}>
            <span><Trophy size={17} /> Football</span>
            <span><Users size={17} /> Groups</span>
            <span><Clock3 size={17} /> Slots</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>What we do</p>
          <h2>A simpler bridge between players and sports venues.</h2>
        </div>
        <p className={styles.aboutText}>
          Planning a game should not mean calling multiple venues, guessing availability, or losing booking details in chat. BookMyTurf gives players a clear way to discover turfs, and gives venue owners a focused dashboard for managing courts, slots, and bookings.
        </p>
      </section>

      <section className={styles.trustGrid} aria-label="Why choose BookMyTurf">
        {trustPoints.map((item) => {
          const Icon = item.icon;
          return (
            <article className={styles.trustCard} key={item.label}>
              <span className={styles.iconBadge}><Icon size={22} /></span>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.workflow}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>How it works</p>
          <h2>From search to game time in three steps.</h2>
        </div>
        <div className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className={styles.step} key={step.title}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <Icon size={24} />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ownerBand}>
        <div>
          <p className={styles.eyebrow}>For turf owners</p>
          <h2>Manage your venue without juggling calls and notes.</h2>
          <p>
            Add turfs, configure courts, manage slots, record offline bookings, and keep your venue operations easier to track.
          </p>
        </div>
        <Link to="/register" className={styles.ownerCta}>
          List your turf <ArrowRight size={18} />
        </Link>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Frequently asked questions</p>
          <h2>Answers before you book.</h2>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <article className={styles.faqItem} key={faq.question}>
                <button
                  className={styles.faqQuestion}
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                >
                  <span><CircleHelp size={19} /> {faq.question}</span>
                  <ChevronDown className={isOpen ? styles.chevronOpen : ''} size={20} />
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.answer}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default About;
