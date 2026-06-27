'use client';

import { Card, Typography, Descriptions, Tag } from 'antd';

const { Title } = Typography;

export default function SSOSettingsPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={4}>SSO Settings</Title>

      <Card title="Google OAuth" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Status">
            <Tag color={process.env.NEXT_PUBLIC_GOOGLE_SSO === 'true' ? 'green' : 'default'}>
              {process.env.NEXT_PUBLIC_GOOGLE_SSO === 'true' ? 'Enabled' : 'Disabled'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Provider">Google Workspace</Descriptions.Item>
          <Descriptions.Item label="Configuration">
            Configure via environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Microsoft Entra ID">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Status">
            <Tag color={process.env.NEXT_PUBLIC_MICROSOFT_SSO === 'true' ? 'green' : 'default'}>
              {process.env.NEXT_PUBLIC_MICROSOFT_SSO === 'true' ? 'Enabled' : 'Disabled'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Provider">Microsoft Entra ID (Azure AD)</Descriptions.Item>
          <Descriptions.Item label="Configuration">
            Configure via environment variables: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
