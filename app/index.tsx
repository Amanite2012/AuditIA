import { Redirect } from 'expo-router';
import React from 'react';

/** Route racine : ouvre le module 1 (Briefing). */
export default function Index(): React.ReactElement {
  return <Redirect href="/briefing" />;
}
