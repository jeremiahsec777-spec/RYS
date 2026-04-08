import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { GlassContainer } from './GlassContainer';

// We mock expo-blur and expo-linear-gradient to simplify testing.
jest.mock('expo-blur', () => ({
  BlurView: ({ children, intensity, tint, style, testID }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return (
      <View testID="blur-view" style={style} {...{ intensity, tint }}>
        {children}
      </View>
    );
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, testID }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View testID={testID || "linear-gradient"}>{children}</View>;
  },
}));

describe('GlassContainer', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <GlassContainer>
        <Text>Test Content</Text>
      </GlassContainer>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies custom style to the outer View', () => {
    const customStyle = { backgroundColor: 'red', marginTop: 10 };
    // To test this easily, we can add a testID to the GlassContainer's outer view,
    // or we can test by finding the element. Since we don't want to modify the source code,
    // let's just do a snapshot test or inspect the tree.

    const tree = render(
      <GlassContainer style={customStyle}>
        <Text>Test</Text>
      </GlassContainer>
    ).toJSON();

    // @ts-ignore
    expect(tree?.props?.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 35 }), // the default style
        expect.objectContaining({ backgroundColor: 'red', marginTop: 10 }), // the custom style
      ])
    );
  });

  it('applies default intensity to BlurView', () => {
    const { getByTestId } = render(
      <GlassContainer>
        <Text>Test</Text>
      </GlassContainer>
    );

    const blurView = getByTestId('blur-view');
    expect(blurView.props.intensity).toBe(50);
  });

  it('applies custom intensity to BlurView', () => {
    const { getByTestId } = render(
      <GlassContainer intensity={80}>
        <Text>Test</Text>
      </GlassContainer>
    );

    const blurView = getByTestId('blur-view');
    expect(blurView.props.intensity).toBe(80);
  });
});
