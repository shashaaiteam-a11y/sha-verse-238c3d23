import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMonetization, PARTNER_REQUIREMENTS } from '@/hooks/useMonetization';
import { 
  DollarSign, TrendingUp, Users, Clock, Play, Award, 
  CreditCard, Gift, Crown, CheckCircle2, AlertCircle, Wallet
} from 'lucide-react';
import { format } from 'date-fns';

interface CreatorEarningsDashboardProps {
  channelId: string;
}

export const CreatorEarningsDashboard = ({ channelId }: CreatorEarningsDashboardProps) => {
  const {
    monetization,
    channelStats,
    isEligible,
    revenueSummary,
    membershipTiers,
    transactions,
    createTier,
    requestPayout,
    applyForPartner,
  } = useMonetization(channelId);

  const [newTier, setNewTier] = useState({ name: '', price: '', benefits: '' });
  const [tierDialogOpen, setTierDialogOpen] = useState(false);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const availableBalance = monetization?.revenue_balance_cents || 0;

  const handleCreateTier = () => {
    createTier.mutate({
      name: newTier.name,
      price_cents: Math.round(parseFloat(newTier.price) * 100),
      benefits: newTier.benefits.split('\n').filter(b => b.trim()),
    });
    setNewTier({ name: '', price: '', benefits: '' });
    setTierDialogOpen(false);
  };

  const subscriberProgress = Math.min(100, ((channelStats?.subscribers || 0) / PARTNER_REQUIREMENTS.subscribers) * 100);
  const watchHoursProgress = Math.min(100, ((channelStats?.watchHours || 0) / PARTNER_REQUIREMENTS.watchHours) * 100);
  const shortsProgress = Math.min(100, ((channelStats?.shortsViews || 0) / PARTNER_REQUIREMENTS.shortsViews) * 100);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Partner Program Status */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <CardTitle className="text-base sm:text-lg">Partner Program</CardTitle>
            </div>
            {monetization?.is_eligible ? (
              <Badge variant="default" className="bg-green-500 w-fit">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
              </Badge>
            ) : isEligible ? (
              <Button size="sm" onClick={() => applyForPartner.mutate()}>
                Apply Now
              </Button>
            ) : (
              <Badge variant="secondary" className="w-fit">
                <AlertCircle className="h-3 w-3 mr-1" /> Not Eligible
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {monetization?.is_eligible 
              ? 'You are earning from your content!'
              : 'Meet requirements to start earning'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Path 1: Standard */}
            <div className="space-y-2 p-3 rounded-lg bg-background/50">
              <p className="text-xs font-medium text-muted-foreground">Standard Path</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Subscribers
                  </span>
                  <span>{channelStats?.subscribers || 0} / {PARTNER_REQUIREMENTS.subscribers}</span>
                </div>
                <Progress value={subscriberProgress} className="h-2" />
                
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Watch Hours
                  </span>
                  <span>{channelStats?.watchHours || 0} / {PARTNER_REQUIREMENTS.watchHours}</span>
                </div>
                <Progress value={watchHoursProgress} className="h-2" />
              </div>
            </div>

            {/* Path 2: Shorts */}
            <div className="space-y-2 p-3 rounded-lg bg-background/50">
              <p className="text-xs font-medium text-muted-foreground">Shorts Path (90 days)</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" /> Shorts Views
                  </span>
                  <span>{(channelStats?.shortsViews || 0).toLocaleString()} / 3M</span>
                </div>
                <Progress value={shortsProgress} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(revenueSummary?.total || 0)}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Ad Revenue</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(revenueSummary?.adRevenue || 0)}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Memberships</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(revenueSummary?.memberships || 0)}</p>
              </div>
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Super Chats</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(revenueSummary?.superchats || 0)}</p>
              </div>
              <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(availableBalance)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Minimum payout: $100.00</p>
            </div>
            <Button 
              disabled={availableBalance < 10000}
              onClick={() => requestPayout.mutate(availableBalance)}
              className="w-full sm:w-auto"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Details */}
      <Tabs defaultValue="memberships" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="memberships" className="text-xs sm:text-sm">Memberships</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="memberships" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm sm:text-base">Membership Tiers</h3>
            <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">Add Tier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Membership Tier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tier Name</Label>
                    <Input 
                      value={newTier.name}
                      onChange={e => setNewTier(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Gold Member"
                    />
                  </div>
                  <div>
                    <Label>Price (USD/month)</Label>
                    <Input 
                      type="number"
                      value={newTier.price}
                      onChange={e => setNewTier(p => ({ ...p, price: e.target.value }))}
                      placeholder="4.99"
                    />
                  </div>
                  <div>
                    <Label>Benefits (one per line)</Label>
                    <textarea 
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newTier.benefits}
                      onChange={e => setNewTier(p => ({ ...p, benefits: e.target.value }))}
                      placeholder="Custom badge&#10;Exclusive content&#10;Priority replies"
                    />
                  </div>
                  <Button onClick={handleCreateTier} className="w-full">Create Tier</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {membershipTiers?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No membership tiers yet</p>
                <p className="text-sm">Create tiers to let fans support you monthly</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {membershipTiers?.map(tier => (
                <Card key={tier.id} className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-lg font-bold text-primary">
                      {formatCurrency(tier.price_cents)}/mo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {tier.benefits?.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              {transactions?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {transactions?.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'ad_revenue' ? 'bg-blue-500/10 text-blue-500' :
                          tx.type === 'membership' ? 'bg-yellow-500/10 text-yellow-500' :
                          tx.type === 'superchat' ? 'bg-pink-500/10 text-pink-500' :
                          'bg-green-500/10 text-green-500'
                        }`}>
                          {tx.type === 'ad_revenue' && <TrendingUp className="h-4 w-4" />}
                          {tx.type === 'membership' && <Crown className="h-4 w-4" />}
                          {tx.type === 'superchat' && <Gift className="h-4 w-4" />}
                          {tx.type === 'premium_revenue' && <DollarSign className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">{tx.type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-500">
                        +{formatCurrency(tx.amount_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
