import React from 'react';
import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../constants/colors';

/**
 * Status pill — shows order stage on the live tracker.
 * `stage` is one of: 'accepted' | 'preparing' | 'ready'.
 * `state` is one of: 'done' | 'active' | 'pending'.
 */

const STAGE_LABEL = {
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
};

const STAGE_HINT = {
  accepted: { active: 'Just now', pending: 'Up next', done: 'Done' },
  preparing: { active: 'In progress', pending: 'Up next', done: 'Done' },
  ready: { active: 'Now', pending: '~ 15 min', done: 'Picked up' },
};

const StatusPill = ({ stage, state }) => {
  const colorByStage = {
    accepted: colors.status.accepted,
    preparing: colors.status.preparing,
    ready: colors.status.ready,
  };
  const tintByStage = {
    accepted: 'bg-tint-accepted',
    preparing: 'bg-tint-preparing',
    ready: 'bg-tint-ready',
  };

  const isActive = state === 'active';
  const isDone = state === 'done';

  return (
    <View
      className={`flex-1 mx-1 rounded-2xl px-3 py-3 border-2 ${
        isActive ? tintByStage[stage] : 'bg-card border-line'
      }`}
      style={{
        borderColor: isActive ? colorByStage[stage] : '#E5E3DA',
        borderWidth: isActive ? 2 : 1,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="w-5 h-5 rounded-full mr-2 items-center justify-center"
          style={{
            backgroundColor: isActive || isDone ? colorByStage[stage] : '#FFFFFF',
            borderWidth: isActive || isDone ? 0 : 2,
            borderColor: colors.ink[300],
          }}
        >
          {isDone && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </View>
        <Text
          className="text-sm font-bold"
          style={{ color: isActive ? colorByStage[stage] : colors.ink[500] }}
        >
          {STAGE_LABEL[stage]}
        </Text>
      </View>
      <Text
        className="text-xs mt-1 ml-7"
        style={{ color: isActive ? colorByStage[stage] : colors.ink[500] }}
      >
        {STAGE_HINT[stage][state]}
      </Text>
    </View>
  );
};

export default StatusPill;
