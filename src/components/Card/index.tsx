import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedGestureHandler,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { snapPoint } from 'react-native-redash';

const { width, height } = Dimensions.get('window');

const aspectRatio = 722 / 368;
const CARD_WIDTH = width - 128;
const CARD_HEIGHT = CARD_WIDTH * aspectRatio;
const IMAGE_WIDTH = CARD_WIDTH * 0.9;
const DURATION = 250;
const side = width + CARD_WIDTH;
const SNAP_POINTS = [-side, 0, side];

interface CardProps {
  card: {
    source: ReturnType<typeof require>;
    rotation: number;
  };
  index: number;
  shuffleBack: Animated.SharedValue<boolean>;
}

export const Card = ({
  card: { source, rotation },
  index,
  shuffleBack
}: CardProps) => {
  // Y axis starts beyond the top of the screen
  const y = useSharedValue(-height - CARD_HEIGHT);
  const x = useSharedValue(0);

  // Sets X axis value so the card looks tilted back
  const rotateX = useSharedValue(30);
  const rotateZ = useSharedValue(0);
  // Initial scale
  const scale = useSharedValue(1);

  const onGestureEvent = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { x: number; y: number }
  >({
    onStart(_, context) {
      // Sets current position values to context
      context.x = x.value;
      context.y = y.value;
      // Visual feedback for gesture start
      scale.value = withTiming(1.1, { easing: Easing.inOut(Easing.ease) });
      rotateX.value = withTiming(0, { easing: Easing.inOut(Easing.ease) });
      rotateZ.value = withTiming(0, { easing: Easing.inOut(Easing.ease) });
    },
    onActive: ({ translationX, translationY }, context) => {
      // Sets each one of the current position values to each axis value so it doesn't get reset after each gesture
      x.value = context.x + translationX;
      y.value = context.y + translationY;
    },
    onEnd({ velocityX, velocityY }) {
      // Snaps cards either to the right or to the left of the screen
      const destination = snapPoint(x.value, velocityX, SNAP_POINTS);

      x.value = withSpring(destination, { velocity: velocityX });
      y.value = withSpring(0, { velocity: velocityY });

      scale.value = withTiming(1, { easing: Easing.inOut(Easing.ease) });
      rotateX.value = withTiming(
        30,
        { easing: Easing.inOut(Easing.ease) },
        () => {
          // When the last card of the array is reached and moved away, sets shuffleBack.value to true
          if (index === 0 && destination !== 0) shuffleBack.value = true;
        }
      );
      rotateZ.value = withTiming(rotation, {
        easing: Easing.inOut(Easing.ease)
      });
    },
    onFail({ velocityX, velocityY }) {
      // Resets style values back to default
      x.value = withSpring(0, { velocity: velocityX });
      y.value = withSpring(0, { velocity: velocityY });

      scale.value = withTiming(1, { easing: Easing.inOut(Easing.ease) });
      rotateX.value = withTiming(30, { easing: Easing.inOut(Easing.ease) });
      rotateZ.value = withTiming(rotation, {
        easing: Easing.inOut(Easing.ease)
      });
    }
  });

  // Default animated styles
  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1500 },
      { rotateX: `${rotateX.value}deg` },
      { rotateZ: `${rotateZ.value}deg` },
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value }
    ]
  }));

  // When shuffleBack.value is true, move cards back to the center of the screen
  useAnimatedReaction(
    () => shuffleBack.value,
    () => {
      if (shuffleBack.value) {
        const delay = 150 * index;
        x.value = withDelay(delay, withSpring(0));
        rotateZ.value = withDelay(
          delay,
          withSpring(rotation, {}, () => {
            shuffleBack.value = false;
          })
        );
      }
    }
  );

  // After rendering, moves cards to the center of the screen, with delay for each card
  useEffect(() => {
    const delay = 1000 + index * DURATION;

    y.value = withDelay(
      delay,
      withTiming(0, {
        duration: DURATION,
        easing: Easing.inOut(Easing.ease)
      })
    );

    rotateZ.value = withDelay(
      delay,
      withTiming(rotation, {
        duration: DURATION,
        easing: Easing.inOut(Easing.ease)
      })
    );
  }, []);

  return (
    <View style={styles.container} pointerEvents='box-none'>
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View style={[styles.card, style]}>
          <Image
            source={source}
            style={{
              width: IMAGE_WIDTH,
              height: IMAGE_WIDTH * aspectRatio
            }}
            resizeMode='contain'
          />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
