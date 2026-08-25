import { classifyProviderOutcome } from './failover';

describe('routing-engine three-branch failover (Arch §3)', () => {
  it('classifies a thrown/timeout outcome as unknown, never as failure', () => {
    expect(classifyProviderOutcome({ threw: true })).toBe('unknown');
  });

  it('classifies JAL_FAILED as a confirmed failure', () => {
    expect(classifyProviderOutcome({ threw: false, status: 'JAL_FAILED' })).toBe('confirmed-failure');
  });

  it('classifies JAL_SUCCESS as a confirmed success', () => {
    expect(classifyProviderOutcome({ threw: false, status: 'JAL_SUCCESS' })).toBe('confirmed-success');
  });

  it('classifies JAL_UNKNOWN as unknown, never assumed success or failure', () => {
    expect(classifyProviderOutcome({ threw: false, status: 'JAL_UNKNOWN' })).toBe('unknown');
  });

  it('classifies JAL_PENDING as pending, distinct from unknown', () => {
    expect(classifyProviderOutcome({ threw: false, status: 'JAL_PENDING' })).toBe('pending');
  });
});
