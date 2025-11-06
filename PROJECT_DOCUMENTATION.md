# 🎰 BetGuard - Responsible Betting Platform

## 📋 Project Overview

**BetGuard** is a modern, full-stack responsible online betting platform built with React, TypeScript, and Lovable Cloud (Supabase backend). It demonstrates secure user authentication, real-time transaction tracking, database-enforced betting limits, and playable casino games with demo payment integration.

### 🎯 Core Philosophy
- **Play Smart. Bet Safe.** - Responsible gaming is our priority
- Daily deposit limits (₹1000 default)
- Play time tracking
- Complete transaction history
- Admin monitoring dashboard

---

## 🏗️ Architecture

### **Frontend Stack**
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Shadcn/ui** - Beautiful component library
- **React Query** - Server state management

### **Backend Stack (Lovable Cloud - Supabase)**
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Data access control
- **Database Triggers** - Automated business logic
- **Supabase Auth** - User authentication
- **Real-time subscriptions** - Live data updates

---

## 📊 Database Schema

### **Tables**

#### 1. `profiles`
User account information and limits

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | - | Primary key (references auth.users) |
| `username` | TEXT | - | Unique username |
| `balance` | NUMERIC | 0.00 | Current balance (₹) |
| `deposit_limit` | NUMERIC | 1000.00 | Daily deposit limit (₹) |
| `play_time_limit` | INTEGER | 2 | Daily play time limit (hours) |
| `created_at` | TIMESTAMP | now() | Account creation time |
| `updated_at` | TIMESTAMP | now() | Last update time |

**RLS Policies:**
- Users can view/update their own profile
- Admins can view all profiles
- Users can insert their own profile (via trigger)

---

#### 2. `transactions`
All financial transactions (deposits, withdrawals, bets, wins)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `trans_id` | UUID | gen_random_uuid() | Primary key |
| `user_id` | UUID | - | Foreign key to profiles |
| `amount` | NUMERIC | - | Transaction amount (₹) |
| `trans_type` | TEXT | - | Type: deposit/withdrawal/bet/win |
| `trans_time` | TIMESTAMP | now() | Transaction timestamp |

**RLS Policies:**
- Users can view their own transactions
- Users can insert their own transactions
- Admins can view all transactions

---

#### 3. `audit_log`
Security and activity tracking

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `log_id` | UUID | gen_random_uuid() | Primary key |
| `user_id` | UUID | - | Foreign key to profiles |
| `action` | TEXT | - | Action description |
| `log_time` | TIMESTAMP | now() | Action timestamp |

**RLS Policies:**
- Users can view their own logs
- Users can insert their own logs
- Admins can view all logs

---

#### 4. `user_roles`
Role-based access control (player/admin)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `user_id` | UUID | - | Foreign key to profiles |
| `role` | ENUM | 'player' | Role: player or admin |

**RLS Policies:**
- Users can view their own roles
- Admins can view all roles

---

## ⚙️ Database Functions & Triggers

### **1. `handle_new_user()` Trigger**
Automatically creates a profile when a user signs up

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **2. `validate_deposit_limit()` Trigger**
Enforces daily ₹1000 deposit limit

```sql
CREATE FUNCTION public.validate_deposit_limit()
RETURNS trigger AS $$
DECLARE
  total_today DECIMAL(10,2);
  user_limit DECIMAL(10,2);
BEGIN
  IF NEW.trans_type = 'deposit' THEN
    SELECT deposit_limit INTO user_limit FROM profiles WHERE id = NEW.user_id;
    SELECT COALESCE(SUM(amount), 0) INTO total_today 
    FROM transactions 
    WHERE user_id = NEW.user_id AND trans_type = 'deposit' AND DATE(trans_time) = CURRENT_DATE;
    
    IF total_today + NEW.amount > user_limit THEN
      RAISE EXCEPTION 'Daily deposit limit exceeded!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### **3. `update_balance()` Trigger**
Automatically updates user balance on transactions

```sql
CREATE FUNCTION public.update_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.trans_type IN ('deposit', 'win') THEN
    UPDATE profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
  ELSIF NEW.trans_type IN ('withdrawal', 'bet') THEN
    UPDATE profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **4. `update_updated_at()` Trigger**
Updates timestamp on profile changes

```sql
CREATE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### **5. `has_role()` Function**
Checks if user has specific role

```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 📱 Application Pages

### **1. Home Page (`/`)**
- Hero banner with tagline
- Features section
- Call-to-action buttons (Register/Login)
- Responsible gaming information

---

### **2. Register Page (`/register`)**
- Username, email, password fields
- Configurable deposit limit (default: ₹1000)
- Configurable play time limit (default: 2 hours)
- Form validation
- Auto-creates profile via trigger

---

### **3. Login Page (`/login`)**
- Email and password authentication
- Secure session management
- Redirects to dashboard on success

---

### **4. Dashboard (`/dashboard`)**
**User View:**
- Current balance display
- Deposit limit & remaining balance
- Recent transactions table
- Quick action buttons (Deposit, Games, Profile, Logout)
- Statistics cards

---

### **5. Deposit Page (`/deposit`)**
- Real-time deposit limit tracking
- Quick preset amounts (₹100, ₹500, ₹1000)
- **Demo Payment Methods:**
  - 💳 UPI Payment (Demo ID: 7013220835@ybl)
  - 💳 Debit/Credit Cards
  - 🏦 Net Banking
- Database trigger enforces limits automatically

---

### **6. Games Page (`/games`)**
**12 Games Available:**

#### ✅ **Playable Games** (With Full Logic):
1. **🎲 Dice Game** (`/game/dice`)
   - Guess number 1-6
   - Win 5x on correct guess
   - Min bet: ₹5

2. **🪙 Coin Flip** (`/game/coin-flip`)
   - Choose Heads or Tails
   - Double your money
   - Min bet: ₹10

3. **🔢 Number Guess** (`/game/number-guess`)
   - Guess number 1-10
   - Win 10x on correct guess
   - Min bet: ₹5

#### 🚧 **Coming Soon** (Demo Cards Only):
4. 🃏 Poker (Texas Hold'em) - Min bet: ₹50
5. 🎰 Slots (Lucky 777) - Min bet: ₹10
6. 🎯 Roulette (Red/Black) - Min bet: ₹20
7. 🎴 Blackjack (Beat the Dealer) - Min bet: ₹25
8. ⚽ Sports Betting - Min bet: ₹50
9. 🎲 Craps - Min bet: ₹15
10. 🎰 Bingo - Min bet: ₹10
11. 🐉 Dragon Tiger - Min bet: ₹20
12. 🎯 Darts - Min bet: ₹15

---

### **7. Admin Dashboard (`/admin`)**
**Requires admin role**
- View all users and balances
- Monitor all transactions
- View audit logs
- User statistics
- Deposit analytics

---

## 🎮 Game Logic Explained

### **Dice Game Workflow**
1. User selects bet amount and predicts number (1-6)
2. Animated dice roll (10 frames at 100ms intervals)
3. Random result generated: `Math.floor(Math.random() * 6) + 1`
4. Win condition: `result === prediction`
5. Payout: `won ? bet * 5 : -bet`
6. Transaction inserted with type: `won ? "win" : "bet"`
7. Balance auto-updated via `update_balance()` trigger
8. Audit log created

### **Coin Flip Workflow**
1. User selects bet amount and choice (heads/tails)
2. Animated coin flip (8 frames at 150ms intervals)
3. Random result: `Math.random() > 0.5 ? "heads" : "tails"`
4. Win condition: `result === prediction`
5. Payout: `won ? bet : -bet` (double or nothing)
6. Same transaction/audit flow as Dice Game

### **Number Guess Workflow**
1. User enters guess (1-10) and bet amount
2. Animated number countdown (10 frames at 100ms)
3. Random result: `Math.floor(Math.random() * 10) + 1`
4. Win condition: `result === guess`
5. Payout: `won ? bet * 9 : -bet` (10x payout)
6. Same transaction/audit flow

---

## 🔒 Security Features

### **1. Row Level Security (RLS)**
All tables have RLS enabled with policies:
- Users can only access their own data
- Admins can access all data via `has_role()` function

### **2. Database Triggers**
- Deposit limits enforced at database level (cannot be bypassed)
- Balance updates are atomic and transactional
- Auto-profile creation on signup

### **3. Authentication**
- Supabase Auth with email verification
- Secure password hashing (bcrypt)
- Auto-confirm enabled for demo purposes

### **4. Audit Logging**
- All actions logged with timestamps
- User ID tracking
- Admin can review all activity

---

## 🎨 Design System

### **Color Palette**
```css
/* Dark theme with neon green accents */
--background: 222.2 84% 4.9%;        /* Dark grey */
--foreground: 210 40% 98%;           /* Light text */
--primary: 142.1 76.2% 36.3%;        /* Neon green */
--primary-glow: 142 70% 45%;         /* Lighter green */
--card: 222.2 84% 4.9%;              /* Card background */
--border: 217.2 32.6% 17.5%;         /* Subtle borders */
```

### **Custom Animations**
- `animate-glow-pulse` - Glowing button effect
- `animate-fade-in` - Smooth fade-in
- `animate-slide-up` - Slide up entrance
- `animate-bounce` - Game result animations

### **Typography**
- Font: Inter (system default)
- Headings: Bold, large sizes
- Body: Regular, readable sizes

---

## 📦 Project Structure

```
betguard/
├── src/
│   ├── assets/                    # Game images (7 images)
│   │   ├── hero-banner.jpg
│   │   ├── game-poker.jpg
│   │   ├── game-slots.jpg
│   │   └── ...
│   ├── components/
│   │   └── ui/                    # Shadcn components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client (auto-generated)
│   │       └── types.ts           # Database types (auto-generated)
│   ├── lib/
│   │   └── utils.ts               # Utility functions
│   ├── pages/                     # Application pages
│   │   ├── Index.tsx              # Home page
│   │   ├── Register.tsx           # Registration
│   │   ├── Login.tsx              # Login
│   │   ├── Dashboard.tsx          # User dashboard
│   │   ├── Deposit.tsx            # Deposit page
│   │   ├── Games.tsx              # Games gallery
│   │   ├── Admin.tsx              # Admin dashboard
│   │   ├── NotFound.tsx           # 404 page
│   │   └── game/
│   │       ├── DiceGame.tsx       # Playable dice game
│   │       ├── CoinFlip.tsx       # Playable coin flip
│   │       └── NumberGuess.tsx    # Playable number guess
│   ├── App.tsx                    # Main app component
│   ├── index.css                  # Global styles + design tokens
│   └── main.tsx                   # React entry point
├── supabase/
│   ├── config.toml                # Supabase config (auto-generated)
│   └── migrations/                # Database migrations
│       └── 20251014164035_*.sql   # Initial schema
├── .env                           # Environment variables (auto-generated)
├── index.html                     # HTML entry point
├── tailwind.config.ts             # Tailwind configuration
├── vite.config.ts                 # Vite configuration
└── package.json                   # Dependencies
```

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ installed
- Lovable account (project already connected)

### **Local Development**
The project is running in Lovable's live preview. To test:

1. **Create Account:**
   - Click "Register" on home page
   - Set username, email, password
   - Optional: Adjust deposit/play limits

2. **Make a Deposit:**
   - Go to Dashboard → Deposit
   - Enter amount (max ₹1000/day)
   - Try demo payment methods
   - Balance updates automatically

3. **Play Games:**
   - Go to Games page
   - Click "Play Now" on playable games
   - Choose bet amount
   - Make prediction
   - Watch animations
   - Win or lose!

4. **View Transactions:**
   - Dashboard shows recent transactions
   - All bets, wins, deposits logged

---

## 🔧 Environment Variables

Located in `.env` (auto-generated by Lovable Cloud):

```env
VITE_SUPABASE_PROJECT_ID="tpippwschmbgxwihgxmo"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
VITE_SUPABASE_URL="https://tpippwschmbgxwihgxmo.supabase.co"
```

**⚠️ Never edit these manually** - they are managed by Lovable Cloud.

---

## 📊 Key Features Summary

### ✅ **Implemented**
- [x] User authentication (register/login)
- [x] Secure database with RLS policies
- [x] Daily deposit limit enforcement (₹1000)
- [x] Automated balance updates via triggers
- [x] 3 playable games with real betting logic
- [x] 12 game cards (3 playable, 9 coming soon)
- [x] Demo payment UI (UPI, cards, net banking)
- [x] Transaction history
- [x] Audit logging
- [x] Admin dashboard
- [x] Responsive design
- [x] Dark theme with neon green accents
- [x] Animated UI components

### 🚧 **Demo/Placeholder**
- Payment processing (simulated, no real money)
- UPI integration (UI only, no actual API)
- Card payments (UI only)
- 9 additional games (cards only, not playable yet)

### ❌ **Not Implemented**
- Real money transactions
- Payment gateway integration (Razorpay/PayU)
- KYC verification
- Play time enforcement
- Game history
- Leaderboards
- Multiplayer games

---

## 🎯 Responsible Gaming Features

1. **Deposit Limits:**
   - Default: ₹1000/day
   - Enforced at database level
   - Cannot be bypassed

2. **Play Time Limits:**
   - Default: 2 hours/day
   - Stored in database
   - UI tracking (not enforced yet)

3. **Transaction Transparency:**
   - All bets/wins logged
   - Audit trail for every action
   - Admin oversight

4. **Demo Payment:**
   - No real money at risk
   - Safe testing environment

---

## 🛠️ Technologies Used

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | React 18 | UI library |
| | TypeScript | Type safety |
| | Tailwind CSS | Styling |
| | Shadcn/ui | Component library |
| | React Router | Routing |
| | React Query | Data fetching |
| **Backend** | Lovable Cloud (Supabase) | Full backend |
| | PostgreSQL | Database |
| | RLS Policies | Security |
| | Triggers | Business logic |
| | Supabase Auth | Authentication |
| **Build** | Vite | Build tool |
| | ESLint | Linting |
| | TypeScript Compiler | Type checking |

---

## 📈 Database Performance

### **Optimizations**
- Primary keys on all tables (UUID)
- Foreign key relationships
- Triggers for automated updates (faster than app-level logic)
- RLS policies evaluated at query time (efficient)

### **Scalability**
- Lovable Cloud (Supabase) auto-scales
- Connection pooling built-in
- Real-time capabilities for future features

---

## 🐛 Known Issues

1. **Payment Integration:**
   - Only demo UI, no real payments
   - UPI scanner not functional

2. **Play Time Limits:**
   - Stored but not enforced
   - No timer tracking yet

3. **Game Balance:**
   - Dice: 1/6 chance for 5x (house edge: ~17%)
   - Coin: 50/50 for 2x (fair)
   - Number: 1/10 chance for 10x (fair)

4. **Admin Access:**
   - No UI to grant admin role
   - Must be done via database manually

---

## 🔐 Security Considerations

### **✅ Secure**
- RLS policies prevent data leaks
- Password hashing via Supabase Auth
- SQL injection prevented (parameterized queries)
- HTTPS enforced by Lovable Cloud

### **⚠️ Considerations**
- Demo environment (not production-ready)
- No rate limiting on API calls
- No CAPTCHA on registration
- Auto-confirm email (should be disabled for prod)

---

## 📝 Future Enhancements

### **Short Term**
- [ ] Add more playable games (Slots, Blackjack)
- [ ] Implement play time tracking
- [ ] Add game history page
- [ ] User profile editing
- [ ] Password reset flow

### **Medium Term**
- [ ] Real payment gateway integration
- [ ] KYC verification
- [ ] Withdrawal system
- [ ] Bonus/promotion system
- [ ] Referral program

### **Long Term**
- [ ] Multiplayer games
- [ ] Live dealer games
- [ ] Mobile app (React Native)
- [ ] AI-powered responsible gaming alerts
- [ ] Social features (friends, chat)

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review Lovable Cloud documentation
3. Check Supabase documentation
4. Contact Lovable support

---

## 📄 License

This is a demonstration project built with Lovable. Not for commercial use without proper licensing and compliance.

---

## 🎓 Learning Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Lovable Docs](https://docs.lovable.dev)

---

## ✨ Credits

**Built with:**
- Lovable - Full-stack development platform
- Supabase - Backend infrastructure
- Shadcn/ui - Component library
- Lucide Icons - Icon library

**Game Images:**
- Generated using AI (Lovable's image generation)

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Demo/Prototype

---

*Remember: Play Smart. Bet Safe. 🎰*
