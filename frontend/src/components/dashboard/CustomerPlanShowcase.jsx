import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { planService } from '../../services/planService';
import { formatCurrency } from '../../utils/formatters';
import { formatBillingCadence } from '../../utils/planAndTaxValidation';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

export default function CustomerPlanShowcase({ onSelectPlan }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cadenceFilter, setCadenceFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    planService
      .listPlans({ isActive: true, pageSize: 20 })
      .then((res) => {
        if (isMounted) {
          setPlans(res.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[Brightloop PlanShowcase] Could not load plans:', err);
          setError('Unable to load available subscription plans.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-6 border border-slate-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-48 bg-slate-100 rounded-xl" />
            <div className="h-48 bg-slate-100 rounded-xl" />
            <div className="h-48 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || plans.length === 0) {
    return null; // Gracefully degrade if no plans configured
  }

  const filteredPlans = plans.filter((p) => {
    if (cadenceFilter === 'all') return true;
    return (p.billing_interval || '').toLowerCase() === cadenceFilter.toLowerCase();
  });

  return (
    <Card className="p-6 space-y-5 border border-slate-200 shadow-sm">
      {/* HEADER & CADENCE TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-700">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Explore Subscription Plans
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Select a tailored plan with transparent recurring billing, risk-free trial, and instant provisioning.
          </p>
        </div>

        {/* CADENCE TOGGLE */}
        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setCadenceFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              cadenceFilter === 'all'
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Plans
          </button>
          <button
            type="button"
            onClick={() => setCadenceFilter('monthly')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              cadenceFilter === 'monthly'
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCadenceFilter('yearly')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              cadenceFilter === 'yearly'
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual (Best Value)
          </button>
        </div>
      </div>

      {/* PLAN PRICING CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredPlans.map((plan) => {
          const isYearly = (plan.billing_interval || '').toLowerCase() === 'yearly';
          const isPro = plan.code.includes('PRO') || plan.name.toLowerCase().includes('pro');
          const isEnterprise = plan.code.includes('ENT') || plan.name.toLowerCase().includes('enterprise');

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl p-4 flex flex-col justify-between transition-all duration-200 border ${
                isPro
                  ? 'border-indigo-400 bg-gradient-to-b from-indigo-50/40 to-white shadow-xs'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              {/* BADGE */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                    isPro
                      ? 'bg-indigo-600 text-white'
                      : isEnterprise
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isPro ? 'Most Popular' : isEnterprise ? 'Enterprise' : 'Starter'}
                </span>

                {plan.trial_period_days > 0 && (
                  <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Clock className="w-3 h-3 mr-1" />
                    {plan.trial_period_days}-Day Trial
                  </span>
                )}
              </div>

              {/* PLAN NAME & CODE */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                  {plan.name}
                </h4>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {plan.code}
                </span>

                {/* PRICING */}
                <div className="mt-3 pb-3 border-b border-slate-100">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {formatCurrency(plan.price, plan.currency || 'USD')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {formatBillingCadence(plan.billing_interval, plan.interval_count)}
                    </span>
                  </div>
                  {plan.minimum_quantity > 1 && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Minimum {plan.minimum_quantity} seats required
                    </span>
                  )}
                </div>

                {/* DESCRIPTION */}
                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {plan.description || 'Full-featured recurring subscription with automated invoicing.'}
                </p>

                {/* FEATURE BULLETS */}
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Automated billing & invoicing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Razorpay online checkout</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Customer self-service portal</span>
                  </li>
                  {isYearly && (
                    <li className="flex items-center space-x-2 text-indigo-700 font-medium">
                      <Zap className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      <span>Annual savings discount</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-4 mt-3">
                <Button
                  variant={isPro ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onSelectPlan(plan)}
                  className={`w-full text-xs font-semibold flex items-center justify-center space-x-1 ${
                    isPro ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : ''
                  }`}
                >
                  <span>Select Plan</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
