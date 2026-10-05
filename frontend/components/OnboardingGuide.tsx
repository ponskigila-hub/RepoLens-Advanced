import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface OnboardingGuideProps {
  result: AnalysisResult;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ result }) => {
  const steps = result.onboarding_guide;
  
  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-950/30 via-blue-950/30 to-cyan-950/30 backdrop-blur-xl rounded-2xl p-8 border border-indigo-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">🚀</span>
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Developer Onboarding Guide
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Step-by-step guide to get started with this repository</p>
      </div>

      {/* Onboarding Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.step} className="relative">
              {/* Connector Line */}
              {!isLast && (
                <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/50 to-cyan-500/50" />
              )}

              {/* Step Card */}
              <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50 hover:border-indigo-500/30 transition-all relative">
                <div className="flex items-start gap-6">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/50">
                      {step.step}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{step.description}</p>

                    {/* Step Badge */}
                    {isFirst && (
                      <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full">
                        <span className="text-emerald-400 text-sm font-semibold">Start Here</span>
                      </div>
                    )}
                    {isLast && (
                      <div className="mt-4 inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 px-3 py-1 rounded-full">
                        <span className="text-purple-400 text-sm font-semibold">Final Step</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-indigo-950/50 to-blue-950/50 rounded-xl p-5 border border-indigo-500/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Pro Tip</h4>
              <p className="text-gray-300 text-sm">
                Follow these steps in order for the smoothest onboarding experience.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-950/50 to-teal-950/50 rounded-xl p-5 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏱️</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Estimated Time</h4>
              <p className="text-gray-300 text-sm">
                Complete setup: {Math.ceil(steps.length * 5)}-{Math.ceil(steps.length * 10)} minutes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-8 bg-black/30 rounded-xl p-6 border border-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Onboarding Progress</span>
          <span className="text-sm font-bold text-white">0 / {steps.length} steps</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-3 rounded-full w-0 transition-all" />
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;

// Made with Bob